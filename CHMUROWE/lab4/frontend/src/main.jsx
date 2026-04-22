import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import "./styles.css";

function HomePage() {
  return (
    <section className="card">
      <h1>Product Dashboard</h1>
      <p>Apka</p>
    </section>
  );
}

function ProductsPage() {
  const [items, setItems] = React.useState([]);
  const [name, setName] = React.useState("");
  const [status, setStatus] = React.useState("loading");

  const loadItems = React.useCallback(async () => {
    setStatus("loading");
    const response = await fetch("/api/items");
    const data = await response.json();
    setItems(data.items);
    setStatus("ready");
  }, []);

  React.useEffect(() => {
    loadItems().catch(() => setStatus("error"));
  }, [loadItems]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    const response = await fetch("/api/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: name.trim() })
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    setName("");
    await loadItems();
  }

  return (
    <section className="card">
      <h1>Produkty</h1>
      <form className="form" onSubmit={handleSubmit}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nowy produkt"
        />
        <button type="submit">Dodaj</button>
      </form>

      {status === "loading" && <p>Wczytywanie...</p>}
      {status === "error" && <p>Nie udalo sie pobrac danych.</p>}

      <ul className="list">
        {items.map((item) => (
          <li key={item.id}>
            {item.name} <span>#{item.id}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatsPage() {
  const [stats, setStats] = React.useState(null);

  async function loadStats() {
    setStats(null);

    return fetch(`/api/stats?ts=${Date.now()}`)
      .then((response) => response.json())
      .then((data) => setStats(data))
      .catch(() => setStats({ error: true }));
  }

  React.useEffect(() => {
    loadStats();
  }, []);

  if (!stats) {
    return (
      <section className="card">
        <h1>Statystyki</h1>
        <p>Wczytywanie...</p>
      </section>
    );
  }

  if (stats.error) {
    return (
      <section className="card">
        <h1>Statystyki</h1>
        <p>Nie udalo sie pobrac statystyk.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h1>Statystyki</h1>
      <p>Liczba produktow: {stats.totalItems}</p>
      <p>Ostatnia instancja backendu: {stats.instanceId}</p>
      <button type="button" onClick={loadStats}>
        Odswiez statystyki
      </button>
    </section>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="nav">
          <Link to="/">Home</Link>
          <Link to="/products">Products</Link>
          <Link to="/stats">Stats</Link>
        </nav>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
