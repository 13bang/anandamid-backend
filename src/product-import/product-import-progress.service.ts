import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class ProductImportProgressService {
    private progressSubject = new Subject<any>();

    sendProgress(message: string, percent: number, payload?: any) {
        this.progressSubject.next({ data: { message, percent, payload } });
    }

    getEventStream() {
        return this.progressSubject.asObservable();
    }
}