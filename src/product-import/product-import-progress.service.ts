import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class ProductImportProgressService {
  private progressSubject = new Subject<any>();

  sendProgress(message: string, percent: number) {
    this.progressSubject.next({ data: { message, percent } });
  }

  getEventStream() {
    return this.progressSubject.asObservable();
  }
}