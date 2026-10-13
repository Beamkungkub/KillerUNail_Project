import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // GET http://localhost:3000/queue-today
  @Get('queue-today')
  getTodayQueue() {
    return this.appService.getTodayQueue();
  }

  // POST http://localhost:3000/dispense/:id
  @Post('dispense/:id')
  dispenseMedicine(@Param('id') id: string) {
    return this.appService.dispenseMedicine(Number(id));
  }

  // GET http://localhost:3000/late-fines
  @Get('late-fines')
  getLateFines() {
    return this.appService.getLateFines();
  }

  // POST http://localhost:3000/dispensing/:id/mark-paid  (กดว่า "จ่ายแล้ว")
  @Post('dispensing/:id/mark-paid')
  markDispensingPaid(@Param('id') id: string) {
    return this.appService.markDispensingPaid(Number(id));
  }

    // GET http://localhost:3000/pending-dispensing
  @Get('pending-dispensing')
  getPendingDispensing() {
    return this.appService.getPendingDispensing();
  }

  // GET http://localhost:3000/dispensing-history
  @Get('dispensing-history')
  getDispensingHistory() {
    return this.appService.getDispensingHistory();
  }

  @Get('blacklist')
  getBlacklist() {
    return this.appService.getBlacklist();
  }

  @Post('blacklist/update')
  triggerUpdateBlacklist() {
    return this.appService.triggerUpdateBlacklist();
  }

    // GET http://localhost:3000/patients
  @Get('patients')
  getPatients() {
    return this.appService.getPatients();
  }

  // POST http://localhost:3000/patients  (เพิ่มคนไข้ใหม่)
  @Post('patients')
  createPatient(@Body() body: {
    name: string;
    numberPhone?: string;
    address?: string;
    dateOfBirth?: string;
    caseHistory?: string;
    cid?: string;
    insuranceTypeId?: number;
    gender?: string;
    bloodType?: string;
    allergy?: string;
    emergencyContact?: string;
  }) {
    return this.appService.createPatient(body);
  }

  // GET http://localhost:3000/doctors
  @Get('doctors')
  getDoctors() {
    return this.appService.getDoctors();
  }

  // GET http://localhost:3000/insurance-types
  @Get('insurance-types')
  getInsuranceTypes() {
    return this.appService.getInsuranceTypes();
  }

  // GET http://localhost:3000/rooms
  @Get('rooms')
  getRooms() {
    return this.appService.getRooms();
  }

  // POST http://localhost:3000/book-appointment
  @Post('book-appointment')
  createAppointment(
    @Body('patientId') patientId: number,
    @Body('doctorId') doctorId: number,
    @Body('roomId') roomId: number,
    @Body('dateTime') dateTime: string,
    @Body('symptom') symptom?: string,
  ) {
    return this.appService.createAppointment(patientId, doctorId, roomId, dateTime, symptom);
  }

  // POST http://localhost:3000/appointment/:id/diagnosis
  @Post('appointment/:id/diagnosis')
  updateDiagnosis(@Param('id') id: string, @Body('diagnosis') diagnosis: string) {
    return this.appService.updateDiagnosis(Number(id), diagnosis);
  }

  // GET http://localhost:3000/stock-alerts
  @Get('stock-alerts')
  getStockAlerts() {
    return this.appService.getStockAlerts();
  }

  // GET http://localhost:3000/patient-history/:id
  @Get('patient-history/:id')
  getPatientHistory(@Param('id') id: string) {
    return this.appService.getPatientHistory(Number(id));
  }
}
