import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShoppingListEntity } from './shopping-list.entity';
import { ShoppingItemEntity } from './shopping-item.entity';

export interface AddItemData {
  name: string;
  quantity?: number;
  unit?: string;
}

export interface UpdateItemData {
  name?: string;
  quantity?: number | null;
  unit?: string | null;
}

@Injectable()
export class ListService {
  constructor(
    @InjectRepository(ShoppingListEntity)
    private readonly listRepo: Repository<ShoppingListEntity>,
    @InjectRepository(ShoppingItemEntity)
    private readonly itemRepo: Repository<ShoppingItemEntity>,
  ) {}

  async createList(familyId: string, name: string): Promise<ShoppingListEntity> {
    const list = this.listRepo.create({ familyId, name });
    return this.listRepo.save(list);
  }

  async findByFamily(familyId: string): Promise<ShoppingListEntity[]> {
    return this.listRepo.find({
      where: { familyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(listId: string): Promise<ShoppingListEntity> {
    const list = await this.listRepo.findOne({
      where: { id: listId },
      relations: ['items'],
      order: { items: { createdAt: 'ASC' } },
    });
    if (!list) throw new NotFoundException('List not found');
    return list;
  }

  async addItem(listId: string, data: AddItemData, userId: string): Promise<ShoppingItemEntity> {
    const exists = await this.listRepo.existsBy({ id: listId });
    if (!exists) throw new NotFoundException('List not found');

    const item = this.itemRepo.create({
      listId,
      name: data.name,
      quantity: data.quantity ?? null,
      unit: data.unit ?? null,
      createdBy: userId,
    });
    return this.itemRepo.save(item);
  }

  async updateItem(itemId: string, data: UpdateItemData): Promise<ShoppingItemEntity> {
    const item = await this.itemRepo.findOneBy({ id: itemId });
    if (!item) throw new NotFoundException('Item not found');
    Object.assign(item, data);
    return this.itemRepo.save(item);
  }

  async toggleItem(itemId: string, checked: boolean, userId: string): Promise<ShoppingItemEntity> {
    const item = await this.itemRepo.findOneBy({ id: itemId });
    if (!item) throw new NotFoundException('Item not found');
    item.checked = checked;
    item.checkedBy = checked ? userId : null;
    return this.itemRepo.save(item);
  }

  async deleteItem(itemId: string): Promise<void> {
    const result = await this.itemRepo.delete(itemId);
    if (result.affected === 0) throw new NotFoundException('Item not found');
  }
}
