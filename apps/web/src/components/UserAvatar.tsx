import { useAuthStore } from '../store/auth.store';

export function UserAvatar() {
  const { user } = useAuthStore();
  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">{user.name.split(' ')[0]}</span>
      {user.picture ? (
        <img
          src={user.picture}
          alt={user.name}
          referrerPolicy="no-referrer"
          className="w-8 h-8 rounded-full object-cover ring-2 ring-primary-100 dark:ring-primary-900"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center ring-2 ring-primary-100 dark:ring-primary-900">
          <span className="text-white text-xs font-semibold">{initials}</span>
        </div>
      )}
    </div>
  );
}
