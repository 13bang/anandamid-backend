import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class TemplateCacheService {
  private cache = new Map<string, { filePath: string; expiresAt: number }>();

  private dir = path.join(process.cwd(), 'uploads', 'temp');

  private async ensureDir() {
    await fs.mkdir(this.dir, { recursive: true });
  }

  private getKey(categoryCodes?: string[], onlyWithSku?: boolean) {
    return `${(categoryCodes || []).join(',')}-${onlyWithSku}`;
  }

  async get(categoryCodes?: string[], onlyWithSku?: boolean) {
    const key = this.getKey(categoryCodes, onlyWithSku);
    const data = this.cache.get(key);

    if (!data) throw new NotFoundException();

    if (Date.now() > data.expiresAt) {
      await fs.unlink(data.filePath).catch(() => {});
      this.cache.delete(key);
      throw new NotFoundException();
    }

    return data.filePath;
  }

    async save(buffer: Buffer, categoryCodes?: string[], onlyWithSku?: boolean) {
        await this.ensureDir();

        const key = this.getKey(categoryCodes, onlyWithSku);

        const filePath = path.join(this.dir, `template-${Date.now()}.xlsx`);
        await fs.writeFile(filePath, buffer);

        this.cache.set(key, {
        filePath,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 menit
        });

        return filePath;
    }

    async getWithMeta(categoryCodes?: string[], onlyWithSku?: boolean) {
        const key = this.getKey(categoryCodes, onlyWithSku);
        const data = this.cache.get(key);

        if (!data) throw new NotFoundException();

        return data; // { filePath, expiresAt }
    }
}