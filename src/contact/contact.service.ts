import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class ContactService {
  async sendEmail(data: any) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'anandamcomputerjogja@gmail.com',
        pass: 'zclwtxuovktiaaaz',
      },
    });

    await transporter.sendMail({
      from: `"${data.name}" <${data.email}>`,
      to: 'sales@anandam.id',
      subject: 'Pertanyaan dari Website Anandam',
      html: `
        <h2>Pesan Baru dari Website</h2>
        <p><b>Nama:</b> ${data.name}</p>
        <p><b>Email:</b> ${data.email}</p>
        <p><b>Pesan:</b></p>
        <p>${data.message}</p>
      `,
    });

    return {
      message: 'Email berhasil dikirim',
    };
  }
}