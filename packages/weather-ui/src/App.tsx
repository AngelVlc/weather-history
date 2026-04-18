import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Station } from './pages/Station';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/station/:stationId" element={<Station />} />
      </Routes>
    </BrowserRouter>
  );
}