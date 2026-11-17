import './core/styles/fonts.css';
import './core/styles/tokens.css';
import './core/styles/base.css';
import './core/ui/ui.css';
import './core/shell/shell.css';
import { startApp } from './core/shell/app';

const container = document.getElementById('app');
if (container) startApp(container, import.meta.env.BASE_URL);
