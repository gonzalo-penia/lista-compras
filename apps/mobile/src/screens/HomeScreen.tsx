import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useFamilies } from '../hooks/useFamilies';
import { useFamilyLists, useCreateList, useDeleteList } from '../hooks/useLists';
import { useAuthStore } from '../store/auth.store';
import { getSocket, disconnectSocket } from '../lib/socket';
import { UserAvatar } from '../components/UserAvatar';
import { Spinner } from '../components/Spinner';
import type { RootStackParamList } from '../navigation';
import type { ShoppingList } from '@familycart/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { clearAuth } = useAuthStore();
  const qc = useQueryClient();

  const [newListName, setNewListName] = useState('');
  const [newListTrackExpenses, setNewListTrackExpenses] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: families, isLoading: loadingFamilies } = useFamilies();
  const family = families?.[0];

  const { data: lists, isLoading: loadingLists } = useFamilyLists(
    family?.id ?? '',
  );
  const createList = useCreateList();
  const deleteList = useDeleteList();

  useEffect(() => {
    if (!family) return;

    let cleanup: (() => void) | undefined;

    getSocket().then((socket) => {
      socket.emit('family:join', family.id);

      const onListAdded = (list: ShoppingList) => {
        qc.setQueryData<ShoppingList[]>(['lists', family.id], (prev) => {
          if (!prev || prev.some((l) => l.id === list.id)) return prev;
          return [list, ...prev];
        });
      };

      const onListDeleted = ({ id }: { id: string }) => {
        qc.setQueryData<ShoppingList[]>(['lists', family.id], (prev) =>
          prev ? prev.filter((l) => l.id !== id) : prev,
        );
      };

      socket.on('list:added', onListAdded);
      socket.on('list:deleted', onListDeleted);

      cleanup = () => {
        socket.emit('family:leave', family.id);
        socket.off('list:added', onListAdded);
        socket.off('list:deleted', onListDeleted);
      };
    });

    return () => cleanup?.();
  }, [family?.id, qc]);

  async function handleLogout() {
    disconnectSocket();
    await clearAuth();
  }

  async function handleCreateList() {
    if (!newListName.trim() || !family) return;
    await createList.mutateAsync({
      familyId: family.id,
      name: newListName.trim(),
      trackExpenses: newListTrackExpenses,
    });
    setNewListName('');
    setNewListTrackExpenses(false);
    setShowForm(false);
  }

  async function handleDeleteConfirmed() {
    if (!confirmDeleteId) return;
    await deleteList.mutateAsync(confirmDeleteId);
    setConfirmDeleteId(null);
  }

  if (loadingFamilies) return <Spinner />;

  const confirmDeleteName = lists?.find((l) => l.id === confirmDeleteId)?.name;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.familyName}>{family?.name}</Text>
          <Text style={styles.inviteCode}>
            Código:{' '}
            <Text style={styles.inviteCodeValue}>{family?.inviteCode}</Text>
          </Text>
        </View>
        <View style={styles.headerActions}>
          <UserAvatar />
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista */}
      <View style={styles.content}>
        <View style={styles.listsHeader}>
          <Text style={styles.listsTitle}>Listas</Text>
          <TouchableOpacity
            style={styles.newListBtn}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.newListBtnText}>+ Nueva lista</Text>
          </TouchableOpacity>
        </View>

        {/* Formulario nueva lista */}
        {showForm && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="Nombre de la lista"
              placeholderTextColor="#9ca3af"
              maxLength={50}
              autoFocus
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Llevar control de gastos</Text>
              <Switch
                value={newListTrackExpenses}
                onValueChange={setNewListTrackExpenses}
                trackColor={{ true: '#16a34a' }}
              />
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowForm(false);
                  setNewListName('');
                  setNewListTrackExpenses(false);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!newListName.trim() || createList.isPending) &&
                    styles.disabledBtn,
                ]}
                onPress={handleCreateList}
                disabled={!newListName.trim() || createList.isPending}
              >
                <Text style={styles.submitBtnText}>
                  {createList.isPending ? 'Creando...' : 'Crear lista'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loadingLists ? (
          <Spinner />
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <TouchableOpacity
                  style={styles.listItemButton}
                  onPress={() =>
                    navigation.navigate('ListDetail', { listId: item.id })
                  }
                >
                  <Text style={styles.listItemName}>{item.name}</Text>
                  {item.trackExpenses && (
                    <Text style={styles.listItemBadge}>· Gastos</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => setConfirmDeleteId(item.id)}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No hay listas aún. ¡Creá la primera!
              </Text>
            }
          />
        )}
      </View>

      {/* Modal confirmación eliminar */}
      <Modal
        visible={!!confirmDeleteId}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>¿Eliminar lista?</Text>
            <Text style={styles.modalText}>
              Estás por eliminar{' '}
              <Text style={styles.modalTextBold}>"{confirmDeleteName}"</Text> y
              todos sus productos. Esta acción no se puede deshacer.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setConfirmDeleteId(null)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalDeleteBtn,
                  deleteList.isPending && styles.disabledBtn,
                ]}
                onPress={handleDeleteConfirmed}
                disabled={deleteList.isPending}
              >
                <Text style={styles.modalDeleteText}>
                  {deleteList.isPending ? 'Eliminando...' : 'Eliminar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  familyName: { fontSize: 18, fontWeight: '700', color: '#15803d' },
  inviteCode: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  inviteCodeValue: { fontFamily: 'monospace', fontWeight: '600', letterSpacing: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoutBtn: { padding: 4 },
  logoutText: { fontSize: 13, color: '#9ca3af' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  listsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listsTitle: { fontSize: 17, fontWeight: '600', color: '#374151' },
  newListBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  newListBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: { fontSize: 14, color: '#4b5563' },
  formActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#6b7280', fontSize: 14 },
  submitBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  disabledBtn: { opacity: 0.5 },
  listContent: { gap: 8, paddingBottom: 24 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listItemButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  listItemName: { fontSize: 15, fontWeight: '500', color: '#111827' },
  listItemBadge: { fontSize: 12, color: '#16a34a', fontWeight: '500', marginLeft: 8 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: 14, color: '#d1d5db' },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    paddingVertical: 48,
  },
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
    gap: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  modalText: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  modalTextBold: { fontWeight: '500', color: '#374151' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: { color: '#374151', fontSize: 14, fontWeight: '500' },
  modalDeleteBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalDeleteText: { color: '#fff', fontSize: 14, fontWeight: '500' },
});
