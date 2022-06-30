import * as React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Link
} from "react-router-dom";
import './App.css';
import FileInfo from './components/FileInfo';
import Files from './components/Files';
import Uploader from './components/Uploader';
import { fetcher } from './utils';


enum APIStatus {
  Online = 'Online',
  Offline = 'Offline'
}

function App() {
  const [appState, setAppState] = React.useState('loaded');
  return (
    <Router>
      <Routes>
        <Route path='/' element={<Layout setAppState={setAppState}/>}>
          <Route index element={<Files appState={appState}/>} />
          <Route path=':id' element={<FileInfo appState={appState}/>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

const Layout = ({setAppState}: {setAppState: (s: string) => void}) => {
  const [apiStatus, setApiStatus] = React.useState<APIStatus>(APIStatus.Offline)

  const getApiStatus = async () => {
    try {
      await fetcher('/');
      setApiStatus(APIStatus.Online);
    } catch (error) {
      console.error('Api status error', error);
      setApiStatus(APIStatus.Offline);
    }
  };

  React.useEffect(() => {
    getApiStatus();
  }, []);
  return (
    <div className="App">
      <header className="App-header">
        <h1>
          Cribl's Diag Upload Service
        </h1>
        <p>API Status is: <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            {apiStatus}
          </a>
        </p>
      </header>
      <main style={{ maxWidth: 760, margin: '0 auto', minHeight: '80vh', padding: 20}}>
        <Link to='/'>{'< Home'}</Link>
        <Uploader setAppState={setAppState}/>
        <Outlet />
      </main>
    </div>
  )
}