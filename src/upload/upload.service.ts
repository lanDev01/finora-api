import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir = join(process.cwd(), 'uploads');

  constructor(private config: ConfigService) {
    if (this.isCloudinaryConfigured()) {
      cloudinary.config({
        cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
        api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
        api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
      });
    } else {
      this.logger.warn(
        'Cloudinary não configurado — uploads serão salvos localmente em uploads/',
      );
    }
  }

  private isCloudinaryConfigured(): boolean {
    return !!(
      this.config.get<string>('CLOUDINARY_CLOUD_NAME') &&
      this.config.get<string>('CLOUDINARY_API_KEY') &&
      this.config.get<string>('CLOUDINARY_API_SECRET')
    );
  }

  async uploadImage(
    buffer: Buffer,
    folder: string,
    mimetype?: string,
  ): Promise<string> {
    if (this.isCloudinaryConfigured()) {
      return this.uploadToCloudinary(buffer, folder);
    }
    return this.uploadLocally(buffer, folder, mimetype);
  }

  private uploadToCloudinary(buffer: Buffer, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            this.logger.error('Falha no upload Cloudinary', error);
            return reject(
              new InternalServerErrorException('Falha no upload da imagem.'),
            );
          }
          resolve(result.secure_url);
        },
      );
      Readable.from(buffer).pipe(stream);
    });
  }

  private async uploadLocally(
    buffer: Buffer,
    folder: string,
    mimetype?: string,
  ): Promise<string> {
    const ext = this.mimeToExt(mimetype) ?? 'jpg';
    const filename = `${randomUUID()}.${ext}`;
    const dir = join(this.uploadDir, folder);

    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), buffer);

    const port = this.config.get<string>('PORT') ?? '3000';
    const baseUrl =
      this.config.get<string>('API_PUBLIC_URL') ?? `http://localhost:${port}`;

    return `${baseUrl}/api/uploads/${folder}/${filename}`;
  }

  private mimeToExt(mimetype?: string): string | null {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    return mimetype ? (map[mimetype] ?? null) : null;
  }

  /**
   * Extrai o public_id de uma URL do Cloudinary para permitir deleção do arquivo.
   * Ex.: https://res.cloudinary.com/<cloud>/image/upload/v123/avatars/abc.jpg → avatars/abc
   */
  extractPublicId(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    return match ? match[1] : null;
  }

  async deleteImage(urlOrPublicId: string): Promise<void> {
    if (urlOrPublicId.includes('/api/uploads/')) {
      const relative = urlOrPublicId.split('/api/uploads/')[1];
      if (relative) {
        await unlink(join(this.uploadDir, relative)).catch(() => undefined);
      }
      return;
    }

    const publicId = urlOrPublicId.includes('cloudinary.com')
      ? (this.extractPublicId(urlOrPublicId) ?? urlOrPublicId)
      : urlOrPublicId;

    if (this.isCloudinaryConfigured()) {
      await cloudinary.uploader.destroy(publicId);
    }
  }
}
