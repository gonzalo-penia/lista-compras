import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackRouteProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useListDetail } from '../hooks/useListDetail';
import { useToggleExpenses, useSettleList } from '../hooks/useLists';
import { useFamilies } from '../hooks/useFamilies';
import { getSocket } from '../lib/socket';
import { useAuthStore } from '../store/auth.store';
import { Spinner } from '../components/Spinner';
import type { RootStackParamList } from '../navigation';
import type { ShoppingList, Expense } from '@familycart/types';

type RouteProp = NativeStackRouteProp<RootStackParamList, 'ListDetail'>;

export function ListDetailScreen() {
  const { params } = useRoute<RouteProp>();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [newItemName, setNewItemName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);

  const { data: list, isLoading } = useListDetail(params.listId);
  const { data: families } = useFamilies();
  const toggleExpenses = useToggleExpenses();
  const settleList = useSettleList();

  const family = families?.[0];
  const memberCount = family?.members?.length ?? 1;

  useEffect(() => {
    if (!params.listId) return;
    let cleanup: (() => void) | undefined;

    getSocket().then((socket) => {
      socket.emit('list:join', params.listId);

      const onItemAdded = (data: any) => {
        qc.setQueryData<ShoppingList>(['list', params.listId], (prev) => {
          if (!prev) return prev;
          if (prev.items.some((i) => i.id === data.id)) return prev;
          return { ...prev, items: [...prev.items, data] };
        });
      };
      const onItemToggled = (data: any) => {
        qc.setQueryData<ShoppingList>(['list', params.listId], (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((i) =>
              i.id === data.id ? { ...i, checked: data.checked, checkedBy: data.checkedBy } : i,
            ),
          };
        });
      };
      const onItemDeleted = ({ id }: { id: string }) => {
        qc.setQueryData<ShoppingList>(['list', params.listId], (prev) => {
          if (!prev) return prev;
          return { ...prev, items: prev.items.filter((i) => i.id !== id) };
        });
      };
      const onExpenseAdded = (expense: Expense) => {
        qc.setQueryData<ShoppingList>(['list', params.listId], (prev) => {
          if (!prev) return prev;
          return { ...prev, expenses: [...(prev.expenses ?? []), expense] };
        });
      };
      const onExpenseDeleted = ({ id }: { id: string }) => {
        qc.setQueryData<ShoppingList>(['list', params.listId], (prev) => {
          if (!prev) return prev;
          return { ...prev, expenses: (prev.expenses ?? []).filter((e) => e.id !== id) };
        });
      };

      socket.on('item:added', onItemAdded);
      socket.on('item:toggled', onItemToggled);
      socket.on('item:deleted', onItemDeleted);
      socket.on('expense:added', onExpenseAdded);
      socket.on('expense:deleted', onExpenseDeleted);

      cleanup = () => {
        socket.emit('list:leave', params.listId);
        socket.off('item:added', onItemAdded);
        socket.off('item:toggled', onItemToggled);
        socket.off('item:deleted', onItemDeleted);
        socket.off('expense:added', onExpenseAdded);
        socket.off('expense:deleted', onExpenseDeleted);
      };
    });

    return () => cleanup?.();
  }, [params.listId, qc]);

  async function handleAddItem() {
    if (!newItemName.trim() || !params.listId || list?.settled) return;
    const socket = await getSocket();
    socket.emit('item:add', { listId: params.listId, name: newItemName.trim() });
    setNewItemName('');
  }

  async function handleToggle(itemId: string, checked: boolean) {
    qc.setQueryData<ShoppingList>(['list', params.listId], (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === itemId
            ? { ...i, checked, checkedBy: checked ? user?.id : undefined }
            : i,
        ),
      };
    });
    const socket = await getSocket();
    socket.emit('item:toggle', { listId: params.listId, itemId, checked });
  }

  async function handleDelete(itemId: string) {
    if (!params.listId || list?.settled) return;
    const socket = await getSocket();
    socket.emit('item:delete', { listId: params.listId, itemId });
  }

  async function handleAddExpense() {
    const amount = parseFloat(expenseAmount);
    if (!amount || amount <= 0 || !params.listId || list?.settled) return;
    const socket = await getSocket();
    socket.emit('expense:add', {
      listId: params.listId,
      amount,
      description: expenseDescription.trim() || undefined,
    });
    setExpenseAmount('');
    setExpenseDescription('');
  }

  async function handleDeleteExpense(expenseId: string) {
    const socket = await getSocket();
    socket.emit('expense:delete', { listId: params.listId, expenseId });
  }

  async function handleToggleExpenses() {
    if (!params.listId || !list || list.settled) return;
    await toggleExpenses.mutateAsync({
      listId: params.listId,
      enabled: !list.trackExpenses,
    });
  }

  async function handleConfirmSettle() {
    if (!params.listId) return;
    await settleList.mutateAsync(params.listId);
    setShowSettleConfirm(false);
  }

  if (isLoading) return <Spinner />;
  if (!list) return null;

  const pending = list.items.filter((i) => !i.checked);
  const done = list.items.filter((i) => i.checked);
  const expenses = list.expenses ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.listName} numberOfLines={1}>{list.name}</Text>
          {list.settled && (
            <Text style={styles.settledBadge}>Lista cerrada</Text>
          )}
        </View>
        <Text style={styles.progress}>
          {done.length}/{list.items.length}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Agregar item */}
        {!list.settled && (
          <View style={styles.addItemRow}>
            <TextInput
              style={styles.addItemInput}
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="Agregar producto..."
              placeholderTextColor="#9ca3af"
              onSubmitEditing={handleAddItem}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addItemBtn, !newItemName.trim() && styles.disabledBtn]}
              onPress={handleAddItem}
              disabled={!newItemName.trim()}
            >
              <Text style={styles.addItemBtnText}>Agregar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Items pendientes */}
        {pending.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <TouchableOpacity
              style={styles.checkCircle}
              onPress={() => handleToggle(item.id, true)}
            />
            <Text style={styles.itemName}>{item.name}</Text>
            {!list.settled && (
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Text style={styles.itemDeleteText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Items comprados */}
        {done.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Comprados ({done.length})</Text>
            {done.map((item) => (
              <View key={item.id} style={[styles.itemRow, styles.itemRowDone]}>
                <TouchableOpacity
                  style={styles.checkCircleDone}
                  onPress={() => handleToggle(item.id, false)}
                >
                  <Text style={styles.checkMark}>✓</Text>
                </TouchableOpacity>
                <Text style={[styles.itemName, styles.itemNameDone]}>{item.name}</Text>
                {!list.settled && (
                  <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <Text style={styles.itemDeleteText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}

        {list.items.length === 0 && (
          <Text style={styles.emptyText}>La lista está vacía.</Text>
        )}

        {/* Sección gastos */}
        <View style={styles.expensesSection}>
          <View style={styles.expensesHeader}>
            <Text style={styles.expensesTitle}>Gastos</Text>
            {!list.settled && (
              <Switch
                value={list.trackExpenses}
                onValueChange={handleToggleExpenses}
                trackColor={{ true: '#16a34a' }}
                disabled={toggleExpenses.isPending}
              />
            )}
          </View>

          {list.trackExpenses && (
            <>
              {!list.settled && (
                <View style={styles.expenseForm}>
                  <View style={styles.expenseAmountRow}>
                    <Text style={styles.currencySign}>$</Text>
                    <TextInput
                      style={styles.expenseAmountInput}
                      value={expenseAmount}
                      onChangeText={setExpenseAmount}
                      placeholder="0.00"
                      placeholderTextColor="#9ca3af"
                      keyboardType="decimal-pad"
                    />
                    <TouchableOpacity
                      style={[
                        styles.addExpenseBtn,
                        (!expenseAmount || parseFloat(expenseAmount) <= 0) &&
                          styles.disabledBtn,
                      ]}
                      onPress={handleAddExpense}
                      disabled={!expenseAmount || parseFloat(expenseAmount) <= 0}
                    >
                      <Text style={styles.addExpenseBtnText}>Agregar</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.expenseDescInput}
                    value={expenseDescription}
                    onChangeText={setExpenseDescription}
                    placeholder="Descripción (opcional)"
                    placeholderTextColor="#9ca3af"
                    maxLength={80}
                  />
                </View>
              )}

              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  isOwn={expense.userId === user?.id}
                  canDelete={!list.settled}
                  onDelete={() => handleDeleteExpense(expense.id)}
                />
              ))}

              {expenses.length === 0 && (
                <Text style={styles.emptyText}>Aún no hay gastos registrados.</Text>
              )}

              {!list.settled && expenses.length > 0 && (
                <TouchableOpacity
                  style={styles.settleBtn}
                  onPress={() => setShowSettleConfirm(true)}
                >
                  <Text style={styles.settleBtnText}>Hacer las cuentas</Text>
                </TouchableOpacity>
              )}

              {list.settled && expenses.length > 0 && (
                <ExpenseSummary
                  expenses={expenses}
                  memberCount={memberCount}
                  members={family?.members ?? []}
                />
              )}
            </>
          )}

          {!list.trackExpenses && !list.settled && (
            <Text style={styles.expensesDisabledText}>
              Activá el seguimiento para registrar gastos en esta lista.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Modal confirmar cierre */}
      <Modal
        visible={showSettleConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettleConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⚠️  ¿Hacer las cuentas?</Text>
            <Text style={styles.modalText}>
              Estás por{' '}
              <Text style={styles.modalTextBold}>
                cerrar esta lista definitivamente
              </Text>
              . No se podrán agregar nuevos productos ni gastos.
            </Text>
            <Text style={styles.modalWarning}>Esta acción no tiene vuelta atrás.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowSettleConfirm(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  settleList.isPending && styles.disabledBtn,
                ]}
                onPress={handleConfirmSettle}
                disabled={settleList.isPending}
              >
                <Text style={styles.modalConfirmText}>
                  {settleList.isPending ? 'Cerrando...' : 'Confirmar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function ExpenseRow({
  expense,
  isOwn,
  canDelete,
  onDelete,
}: {
  expense: Expense;
  isOwn: boolean;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const initials = expense.user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={styles.expenseRow}>
      <View style={styles.expenseAvatar}>
        <Text style={styles.expenseAvatarText}>{initials}</Text>
      </View>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseName}>
          {expense.user.name.split(' ')[0]}
          {expense.description ? (
            <Text style={styles.expenseDesc}> · {expense.description}</Text>
          ) : null}
        </Text>
      </View>
      <Text style={styles.expenseAmount}>${Number(expense.amount).toFixed(2)}</Text>
      {isOwn && canDelete && (
        <TouchableOpacity onPress={onDelete}>
          <Text style={styles.itemDeleteText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ExpenseSummary({
  expenses,
  memberCount,
  members,
}: {
  expenses: Expense[];
  memberCount: number;
  members: { id: string; name: string }[];
}) {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const fairShare = total / memberCount;

  const byUser = expenses.reduce<Record<string, { name: string; paid: number }>>(
    (acc, e) => {
      if (!acc[e.userId]) acc[e.userId] = { name: e.user.name.split(' ')[0], paid: 0 };
      acc[e.userId].paid += Number(e.amount);
      return acc;
    },
    {},
  );
  members.forEach((m) => {
    if (!byUser[m.id]) byUser[m.id] = { name: m.name.split(' ')[0], paid: 0 };
  });

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Desglose final</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total gastado</Text>
        <Text style={styles.summaryValue}>${total.toFixed(2)}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Corresponde a cada uno ({memberCount})</Text>
        <Text style={styles.summaryValue}>${fairShare.toFixed(2)}</Text>
      </View>
      <View style={styles.summaryDivider} />
      {Object.entries(byUser).map(([userId, { name, paid }]) => {
        const balance = paid - fairShare;
        return (
          <View key={userId} style={styles.summaryRow}>
            <Text style={styles.summaryName}>{name}</Text>
            <View style={styles.summaryBalance}>
              <Text style={styles.summaryPaid}>pagó ${paid.toFixed(2)}</Text>
              {Math.abs(balance) < 0.01 ? (
                <Text style={styles.balanceEven}>✓ par</Text>
              ) : balance > 0 ? (
                <Text style={styles.balancePositive}>le deben ${balance.toFixed(2)}</Text>
              ) : (
                <Text style={styles.balanceNegative}>debe ${Math.abs(balance).toFixed(2)}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 20, color: '#9ca3af' },
  headerTitle: { flex: 1 },
  listName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  settledBadge: { fontSize: 11, color: '#d97706', fontWeight: '500', marginTop: 2 },
  progress: { fontSize: 14, color: '#9ca3af' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 8, paddingBottom: 40 },
  addItemRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  addItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  addItemBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addItemBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  disabledBtn: { opacity: 0.5 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  itemRowDone: { opacity: 0.6 },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    flexShrink: 0,
  },
  checkCircleDone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    borderWidth: 2,
    borderColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  checkMark: { color: '#fff', fontSize: 11 },
  itemName: { flex: 1, fontSize: 14, color: '#111827' },
  itemNameDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
  itemDeleteText: { fontSize: 13, color: '#d1d5db' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  emptyText: { textAlign: 'center', color: '#9ca3af', fontSize: 14, paddingVertical: 16 },
  expensesSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 16,
    paddingTop: 20,
    gap: 12,
  },
  expensesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expensesTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  expensesDisabledText: { textAlign: 'center', color: '#9ca3af', fontSize: 13 },
  expenseForm: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 10,
  },
  expenseAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currencySign: { fontSize: 15, color: '#9ca3af', marginLeft: 4 },
  expenseAmountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  addExpenseBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addExpenseBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  expenseDescInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  expenseAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  expenseAvatarText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  expenseInfo: { flex: 1 },
  expenseName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  expenseDesc: { fontWeight: '400', color: '#6b7280' },
  expenseAmount: { fontSize: 14, fontWeight: '600', color: '#16a34a' },
  settleBtn: {
    borderWidth: 2,
    borderColor: '#fbbf24',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  settleBtnText: { color: '#d97706', fontSize: 14, fontWeight: '600' },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    gap: 10,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: '#6b7280' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  summaryDivider: { height: 1, backgroundColor: '#f3f4f6' },
  summaryName: { fontSize: 13, fontWeight: '500', color: '#374151' },
  summaryBalance: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  summaryPaid: { fontSize: 12, color: '#9ca3af' },
  balanceEven: { fontSize: 12, fontWeight: '600', color: '#16a34a' },
  balancePositive: { fontSize: 12, fontWeight: '600', color: '#16a34a' },
  balanceNegative: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalText: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  modalTextBold: { fontWeight: '600', color: '#374151' },
  modalWarning: { fontSize: 13, fontWeight: '500', color: '#d97706' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: { color: '#374151', fontSize: 14, fontWeight: '500' },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
