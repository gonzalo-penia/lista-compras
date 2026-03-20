import { Controller, Post, Get, Delete, Patch, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { IsString, MinLength, MaxLength, IsUUID, IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { ListService } from './list.service';
import { ListGateway } from './list.gateway';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class CreateListDto {
  @IsString() @MinLength(1) @MaxLength(50)
  name!: string;

  @IsUUID()
  familyId!: string;

  @IsBoolean() @IsOptional()
  trackExpenses?: boolean;
}

class SetExpenseTrackingDto {
  @IsBoolean()
  enabled!: boolean;
}

@Controller('lists')
@UseGuards(JwtAuthGuard)
export class ListController {
  constructor(
    private readonly listService: ListService,
    private readonly listGateway: ListGateway,
  ) {}

  @Post()
  async create(@Body() dto: CreateListDto) {
    const list = await this.listService.createList(dto.familyId, dto.name, dto.trackExpenses ?? false);
    this.listGateway.notifyListCreated(dto.familyId, list);
    return list;
  }

  @Get('family/:familyId')
  findByFamily(@Param('familyId') familyId: string) {
    return this.listService.findByFamily(familyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listService.findById(id);
  }

  @Patch(':id/expenses')
  async setExpenseTracking(@Param('id') id: string, @Body() dto: SetExpenseTrackingDto) {
    const list = await this.listService.setExpenseTracking(id, dto.enabled);
    this.listGateway.notifyExpenseTrackingChanged(id, list.trackExpenses);
    return list;
  }

  @Patch(':id/settle')
  async settle(@Param('id') id: string) {
    const list = await this.listService.settleList(id);
    this.listGateway.notifyListSettled(id);
    return list;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    const { familyId } = await this.listService.deleteList(id);
    this.listGateway.notifyListDeleted(familyId, id);
  }
}
