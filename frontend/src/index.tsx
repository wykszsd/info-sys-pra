
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import App from './App';
import { enableMapSet } from 'immer'
enableMapSet();
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(

  <App />

);

