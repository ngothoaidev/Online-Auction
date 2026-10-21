import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { IconButton } from './ui';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme() ?? {};
  const dark = theme === 'dark';

  return (
    <IconButton label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme} className={className}>
      {dark ? <Moon size={20} /> : <Sun size={20} />}
    </IconButton>
  );
}
