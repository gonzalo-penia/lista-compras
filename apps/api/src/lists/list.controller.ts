import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { IsString, MinLength, MaxLength, IsUUID } from 'class-validator';
import { ListService } from './list.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class CreateListDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsUUID()
  familyId!: string;
}

@Controller('lists')
@UseGuards(JwtAuthGuard)
export class ListController {
  constructor(private readonly listService: ListService) {}

  @Post()
  create(@Body() dto: CreateListDto) {
    return this.listService.createList(dto.familyId, dto.name);
  }

  @Get('family/:familyId')
  findByFamily(@Param('familyId') familyId: string) {
    return this.listService.findByFamily(familyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listService.findById(id);
  }
}
