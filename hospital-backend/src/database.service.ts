import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: any;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const sqlModule = require('mssql/msnodesqlv8');

    const config = {
      connectionString: `Driver={ODBC Driver 18 for SQL Server};Server=${this.configService.get<string>('DB_SERVER')};Database=${this.configService.get<string>('DB_DATABASE')};Trusted_Connection=Yes;TrustServerCertificate=Yes;`,
};

    this.pool = await new sqlModule.ConnectionPool(config).connect();
    console.log('เชื่อมต่อ SQL Server สำเร็จ');
  }

  async onModuleDestroy() {
    await this.pool.close();
  }

  getPool() {
    return this.pool;
  }
}