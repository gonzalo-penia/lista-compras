import { Controller, Post, Get, Delete, Patch, Body, Param, Req, UseGuards, ForbiddenException, HttpCode, HttpStatus } from '@nestjs/common';
import { IsString, MinLength, MaxLength, IsUUID, IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { Request } from 'express';
import { ListService } from './list.service';
import { ListGateway } from './list.gateway';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FamilyService } from '../families/family.service';
import { UserEntity } from '../users/user.entity';

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
    private readonly familyService: FamilyService,
  ) {}

  private async assertFamilyAccess(familyId: string, userId: string): Promise<void> {
    if (!(await this.familyService.isMember(userId, familyId))) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async assertListAccess(listId: string, userId: string): Promise<string> {
    const list = await this.listService.findById(listId);
    await this.assertFamilyAccess(list.familyId, userId);
    return list.familyId;
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateListDto) {
    const user = req.user as UserEntity;
    await this.assertFamilyAccess(dto.familyId, user.id);
    const list = await this.listService.createList(dto.familyId, dto.name, dto.trackExpenses ?? false);
    this.listGateway.notifyListCreated(dto.familyId, list);
    return list;
  }

  @Get('family/:familyId')
  async findByFamily(@Req() req: Request, @Param('familyId') familyId: string) {
    const user = req.user as UserEntity;
    await this.assertFamilyAccess(familyId, user.id);
    return this.listService.findByFamily(familyId);
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserEntity;
    await this.assertListAccess(id, user.id);
    return this.listService.findById(id);
  }

  @Patch(':id/expenses')
  async setExpenseTracking(@Req() req: Request, @Param('id') id: string, @Body() dto: SetExpenseTrackingDto) {
    const user = req.user as UserEntity;
    await this.assertListAccess(id, user.id);
    const list = await this.listService.setExpenseTracking(id, dto.enabled);
    this.listGateway.notifyExpenseTrackingChanged(id, list.trackExpenses);
    return list;
  }

  @Patch(':id/settle')
  async settle(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserEntity;
    await this.assertListAccess(id, user.id);
    const list = await this.listService.settleList(id);
    this.listGateway.notifyListSettled(id);
    return list;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserEntity;
    const familyId = await this.assertListAccess(id, user.id);
    await this.listService.deleteList(id);
    this.listGateway.notifyListDeleted(familyId, id);
  }
}
