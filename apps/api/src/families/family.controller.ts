import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { IsString, MinLength, MaxLength } from 'class-validator';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserEntity } from '../users/user.entity';

class CreateFamilyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;
}

class JoinFamilyDto {
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  inviteCode!: string;
}

@Controller('families')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateFamilyDto) {
    const user = req.user as UserEntity;
    return this.familyService.create(user.id, dto.name);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  join(@Req() req: Request, @Body() dto: JoinFamilyDto) {
    const user = req.user as UserEntity;
    return this.familyService.join(user.id, dto.inviteCode.toUpperCase());
  }

  @Get()
  findMine(@Req() req: Request) {
    const user = req.user as UserEntity;
    return this.familyService.findByMember(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.familyService.findById(id);
  }
}
