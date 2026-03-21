import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShoppingListEntity } from './shopping-list.entity';
import { ShoppingItemEntity } from './shopping-item.entity';
import { ExpenseEntity } from './expense.entity';

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
    @InjectRepository(ExpenseEntity)
    private readonly expenseRepo: Repository<ExpenseEntity>,
  ) {}

  async createList(familyId: string, name: string, trackExpenses = false): Promise<ShoppingListEntity> {
    const list = this.listRepo.create({ familyId, name, trackExpenses });
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
      relations: ['items', 'expenses', 'expenses.user'],
      order: { items: { createdAt: 'ASC' }, expenses: { createdAt: 'ASC' } },
    });
    if (!list) throw new NotFoundException('List not found');
    return list;
  }

  async setExpenseTracking(listId: string, enabled: boolean): Promise<ShoppingListEntity> {
    const list = await this.listRepo.findOneBy({ id: listId });
    if (!list) throw new NotFoundException('List not found');
    list.trackExpenses = enabled;
    return this.listRepo.save(list);
  }

  async addExpense(listId: string, userId: string, amount: number, description?: string): Promise<ExpenseEntity> {
    const list = await this.listRepo.findOneBy({ id: listId });
    if (!list) throw new NotFoundException('List not found');
    if (list.settled) throw new ForbiddenException('List is settled, no more expenses can be added');
    const expense = this.expenseRepo.create({ listId, userId, amount, description: description ?? null });
    const saved = await this.expenseRepo.save(expense);
    return this.expenseRepo.findOne({ where: { id: saved.id }, relations: ['user'] }) as Promise<ExpenseEntity>;
  }

  async deleteExpense(expenseId: string): Promise<void> {
    const result = await this.expenseRepo.delete(expenseId);
    if (result.affected === 0) throw new NotFoundException('Expense not found');
  }

  async settleList(listId: string): Promise<ShoppingListEntity> {
    const list = await this.listRepo.findOneBy({ id: listId });
    if (!list) throw new NotFoundException('List not found');
    list.settled = true;
    return this.listRepo.save(list);
  }

  async addItem(listId: string, data: AddItemData, userId: string): Promise<ShoppingItemEntity> {
    const list = await this.listRepo.findOneBy({ id: listId });
    if (!list) throw new NotFoundException('List not found');
    if (list.settled) throw new ForbiddenException('List is settled, no more items can be added');

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

  async deleteList(listId: string): Promise<{ familyId: string }> {
    const list = await this.listRepo.findOneBy({ id: listId });
    if (!list) throw new NotFoundException('List not found');
    await this.listRepo.delete(listId);
    return { familyId: list.familyId };
  }
}
