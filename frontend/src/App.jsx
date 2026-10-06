import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchCurrentUser,
  fetchDeliveryAvailability,
  fetchMenu,
  fetchOrder,
  fetchOrderEvents,
  fetchOrders,
  fetchRestaurants,
  login,
  placeOrder,
  updateCourierLocation,
  updateOrderStatus,
} from "./api/client";
import { StatusTimeline } from "./components/StatusTimeline";
import { useOrderSocket } from "./hooks/useOrderSocket";

const SESSION_KEY = "food_ordering_session";
const DELIVERY_FEE_MINOR = 499;
const DEMO_ACCOUNTS = [
  { name: "Priya Sharma", role: "customer", email: "customer@example.com" },
  { name: "Aarav Menon", role: "customer", email: "customer2@example.com" },
  { name: "Meera Iyer", role: "customer", email: "customer3@example.com" },
  { name: "Kabir Rao", role: "customer", email: "customer4@example.com" },
  { name: "Ankit Rao · Copper Kadhai", role: "restaurant", email: "restaurant@example.com" },
  { name: "Nisha Gowda · Namma Dosa House", role: "restaurant", email: "restaurant2@example.com" },
  { name: "Devika Nair · Green Leaf Kitchen", role: "restaurant", email: "restaurant3@example.com" },
  { name: "Sanjay Kulkarni · Bengaluru Bowl Co.", role: "restaurant", email: "restaurant4@example.com" },
  { name: "Farah Khan · Little Italy Trattoria", role: "restaurant", email: "restaurant5@example.com" },
  { name: "Ravi Kumar", role: "delivery_partner", email: "delivery@example.com" },
  { name: "Kiran Das", role: "delivery_partner", email: "delivery2@example.com" },
  { name: "Neel Joseph", role: "delivery_partner", email: "delivery3@example.com" },
  { name: "Sana Sheikh", role: "delivery_partner", email: "delivery4@example.com" },
  { name: "Rohan Pillai", role: "delivery_partner", email: "delivery5@example.com" },
].map((account) => ({ ...account, password: "portfolio123" }));
const INITIAL_DELIVERY = {
  deliveryAddress: "221B Fleet Street, Bengaluru",
  deliveryLatitude: 12.9716,
  deliveryLongitude: 77.5946,
};
const STATUS_LABELS = {
  placed: "New order",
  confirmed: "Accepted",
  preparing: "Being prepared",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function formatCurrency(amountMinor) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format((amountMinor ?? 0) / 100);
}

function statusLabel(status) {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

function roleLabel(role) {
  if (role === "delivery_partner") return "Delivery partner";
  if (role === "restaurant") return "Restaurant";
  return "Customer";
}

function roleHeading(role) {
  if (role === "restaurant") return "Your kitchen";
  if (role === "delivery_partner") return "Your deliveries";
  return "Order something good";
}

function nextActionsFor(role, status) {
  if (role === "restaurant") {
    if (status === "placed") return ["confirmed", "cancelled"];
    if (status === "confirmed") return ["preparing", "cancelled"];
    if (status === "preparing") return ["out_for_delivery", "cancelled"];
  }
  if (role === "delivery_partner" && status === "out_for_delivery") return ["delivered"];
  return [];
}

function readStoredSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function AuthScreen({ loginForm, onChange, onSubmit, onDemoFill, loading, error }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand brand--large">
          <span className="brand__mark" aria-hidden="true">F</span>
          <span>Sunday Table</span>
        </div>
        <h1>Food ordering, made simple.</h1>
        <p className="muted">
          Sign in to order a meal, manage a restaurant, or deliver an order.
        </p>
        <form className="form-stack" onSubmit={onSubmit}>
          <label className="field">
            <span>Email address</span>
            <input
              autoComplete="username"
              required
              type="email"
              value={loginForm.email}
              onChange={(event) => onChange("email", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              required
              type="password"
              value={loginForm.password}
              onChange={(event) => onChange("password", event.target.value)}
            />
          </label>
          {error ? <p className="notice notice--error" role="alert">{error}</p> : null}
          <button className="button button--primary" disabled={loading} type="submit">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="demo-login">
          <p className="field-hint">Or fill in a demo account:</p>
          <details className="demo-account-list">
            <summary>Browse all demo accounts</summary>
            <p className="field-hint">All demo accounts use password <strong>portfolio123</strong>.</p>
            <div className="demo-login__buttons">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  className="button button--quiet"
                  key={account.email}
                  onClick={() => onDemoFill({ email: account.email, password: account.password })}
                  type="button"
                >
                  {account.name} · {roleLabel(account.role)}
                </button>
              ))}
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}

function AppHeader({ user, onLogout, socketState, selectedOrderId }) {
  const liveLabel = !selectedOrderId
    ? "Ready"
    : socketState === "open"
      ? "Live updates on"
      : socketState === "connecting"
        ? "Connecting…"
        : "Live updates reconnecting";

  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Sunday Table home">
        <span className="brand__mark" aria-hidden="true">S</span>
        <span>Sunday Table</span>
      </a>
      {user.role === "customer" ? (
        <nav aria-label="Main navigation" className="main-nav">
          <a href="#menu">Discover</a>
          <a href="#my-orders">My orders</a>
        </nav>
      ) : null}
      <div className="account">
        <span className={`live-indicator ${socketState === "open" ? "live-indicator--on" : ""}`}>
          {liveLabel}
        </span>
        <span className="account__name">{user.full_name}</span>
        <button className="button button--quiet button--small" onClick={onLogout} type="button">
          Sign out
        </button>
      </div>
    </header>
  );
}

function PageIntro({ user, orders, error, onDismissError }) {
  return (
    <section className="page-intro">
      <div>
        <p className="kicker">{roleLabel(user.role)} account</p>
        <h1>{roleHeading(user.role)}</h1>
        <p className="muted">
          {user.role === "customer"
            ? "Choose a restaurant, add dishes, and follow your order here."
            : user.role === "restaurant"
              ? "Review incoming orders and update each order as your kitchen works."
              : "See assigned orders, update your location, and mark deliveries complete."}
        </p>
      </div>
      <div className="order-count">
        <strong>{orders.length}</strong>
        <span>{orders.length === 1 ? "order" : "orders"}</span>
      </div>
      {error ? (
        <div className="notice notice--error page-intro__notice" role="alert">
          <span>{error}</span>
          <button aria-label="Dismiss message" onClick={onDismissError} type="button">×</button>
        </div>
      ) : null}
    </section>
  );
}

function CustomerHero({ user }) {
  const firstName = user.full_name.split(" ")[0];
  return (
    <section className="welcome-hero">
      <div className="welcome-hero__copy">
        <p className="hero-kicker">GOOD FOOD, GOOD MOOD</p>
        <h2>A little something<br />wonderful, {firstName}.</h2>
        <p>Thoughtful meals from the kitchens you love, brought right to your door.</p>
        <a className="hero-link" href="#menu">Explore the menu <span aria-hidden="true">↗</span></a>
      </div>
      <div aria-hidden="true" className="hero-still-life">
        <span className="hero-still-life__sun" />
        <span className="hero-still-life__plate">
          <span className="hero-still-life__food">
            <i /><i /><i /><i /><i />
          </span>
        </span>
        <span className="hero-still-life__leaf hero-still-life__leaf--one" />
        <span className="hero-still-life__leaf hero-still-life__leaf--two" />
      </div>
      <div className="hero-index"><span>01</span><span className="hero-index__line" /><span>FRESHLY MADE</span></div>
    </section>
  );
}

function PanelHeading({ title, description, action }) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {description ? <p className="muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function CourierLocationPanel({ courierDraft, setCourierDraft, onCourierUpdate, loading }) {
  return (
    <details className="location-details courier-location">
      <summary>Update my location</summary>
      <p className="field-hint">Keep your location current for nearby delivery assignments.</p>
      <div className="location-fields">
        <label className="field">
          <span>Latitude</span>
          <input
            max="90"
            min="-90"
            type="number"
            step="any"
            value={courierDraft.latitude}
            onChange={(event) => setCourierDraft((current) => ({ ...current, latitude: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Longitude</span>
          <input
            max="180"
            min="-180"
            type="number"
            step="any"
            value={courierDraft.longitude}
            onChange={(event) => setCourierDraft((current) => ({ ...current, longitude: event.target.value }))}
          />
        </label>
      </div>
      <label className="check-line">
        <input
          checked={courierDraft.is_available}
          onChange={(event) => setCourierDraft((current) => ({
            ...current,
            is_available: event.target.checked,
          }))}
          type="checkbox"
        />
        <span>Available for new deliveries</span>
      </label>
      <button className="button button--quiet" disabled={loading} onClick={onCourierUpdate} type="button">
        Save location
      </button>
    </details>
  );
}

function OrderList({
  orders,
  selectedOrderId,
  onSelect,
  onRefresh,
  loading,
  customer,
  deliveryPartner,
  availablePartners,
}) {
  const completedOrders = orders.filter((order) => ["delivered", "cancelled"].includes(order.status));
  const activeOrders = orders.filter((order) => !["delivered", "cancelled"].includes(order.status));

  const partnerSummary = (order) => {
    if (order.delivery_partner_name) {
      return `Assigned to ${order.delivery_partner_name}`;
    }
    if (order.status === "cancelled" || order.status === "delivered") {
      return "No courier assigned";
    }
    return "Waiting for restaurant dispatch";
  };

  const renderOrders = (items) => (
    <div className="order-list">
      {items.map((order) => (
        <button
          aria-pressed={selectedOrderId === order.id}
          className={`order-row ${selectedOrderId === order.id ? "order-row--selected" : ""}`}
          key={order.id}
          onClick={() => onSelect(order.id)}
          type="button"
        >
          <span className="order-row__body">
            <strong>{statusLabel(order.status)}</strong>
            <small>Order #{order.id.slice(0, 8)}</small>
            {deliveryPartner ? (
              <>
                <small className="order-row__address">{order.delivery_address}</small>
                <small>{order.status === "delivered" ? "Delivered" : order.status === "cancelled" ? "Cancelled" : order.delivery_partner_name ? `Assigned to ${order.delivery_partner_name}` : "Waiting for restaurant dispatch"}</small>
              </>
            ) : null}
            {!customer && !deliveryPartner ? (
              <small>{partnerSummary(order)}</small>
            ) : null}
          </span>
          <strong>{formatCurrency(order.total_minor)}</strong>
        </button>
      ))}
    </div>
  );

  return (
    <section className="panel">
      <PanelHeading
        title={customer ? "Your orders" : deliveryPartner ? "My deliveries" : "Order queue"}
        description={customer
          ? "Choose an order to see its progress."
          : deliveryPartner
            ? "See what needs delivering and review completed jobs."
            : "Select an order to review it."}
        action={
          <button className="button button--quiet button--small" disabled={loading} onClick={onRefresh} type="button">
            {loading ? "Loading…" : "Refresh"}
          </button>
        }
      />
      {deliveryPartner ? (
        <div className="delivery-order-groups">
          <div>
            <div className="list-section-heading">
              <h3>Active deliveries</h3>
              <span>{activeOrders.length}</span>
            </div>
            {activeOrders.length ? renderOrders(activeOrders) : (
              <div className="empty-state empty-state--compact">
                <strong>No active delivery</strong>
                <p>Orders assigned to you will appear here when the restaurant dispatches them.</p>
              </div>
            )}
          </div>
          <div>
            <div className="list-section-heading">
              <h3>Delivery history</h3>
              <span>{completedOrders.length}</span>
            </div>
            {completedOrders.length ? renderOrders(completedOrders) : (
              <p className="list-hint">Completed and cancelled deliveries will be kept here.</p>
            )}
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <strong>{customer ? "No orders yet" : "Nothing needs attention"}</strong>
          <p>{customer ? "Your placed orders will show up here." : "New orders will appear here."}</p>
        </div>
      ) : (
        renderOrders(orders)
      )}
      {!customer && !deliveryPartner ? (
        <p
          aria-live="polite"
          className={`partner-availability ${availablePartners === 0 ? "partner-availability--empty" : ""}`}
        >
          {availablePartners === null
            ? "Courier availability is not available right now."
            : availablePartners === 0
              ? "No delivery partners are available. Refresh later before dispatching an order."
              : `${availablePartners} delivery partner${availablePartners === 1 ? "" : "s"} available for dispatch.`}
        </p>
      ) : null}
    </section>
  );
}

function MenuPanel({
  restaurants,
  selectedRestaurantId,
  onRestaurantChange,
  menuItems,
  menuLoading,
  cart,
  onQuantityChange,
}) {
  return (
    <section className="menu-section" id="menu">
      <PanelHeading
        title="Choose your food"
        description="Made with care. Ready when you are."
      />
      <label className="field restaurant-picker">
        <span>Restaurant</span>
        <select
          disabled={restaurants.length === 0}
          value={selectedRestaurantId}
          onChange={(event) => onRestaurantChange(event.target.value)}
        >
          {restaurants.length === 0 ? <option value="">No restaurants available</option> : null}
          {restaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
          ))}
        </select>
      </label>
      {menuLoading ? <p className="loading-copy">Loading menu…</p> : null}
      {!menuLoading && menuItems.length === 0 ? (
        <div className="empty-state">
          <strong>No dishes to show</strong>
          <p>Try another restaurant or refresh the page.</p>
        </div>
      ) : (
        <div className="dish-grid">
          {menuItems.map((item, index) => {
            const quantity = cart[item.id] ?? 0;
            const soldOut = !item.is_available || item.available_inventory < 1;
            return (
              <article className={`dish-card dish-card--${index % 4}`} key={item.id}>
                <div aria-hidden="true" className="dish-card__art">
                  <span className="dish-card__plate"><span className="dish-card__garnish" /></span>
                  <span className="dish-card__number">0{index + 1}</span>
                </div>
                <div className="dish-card__content">
                  <div className="dish-card__topline">
                    <span className={soldOut ? "stock stock--empty" : "stock"}>
                      {soldOut ? "SOLD OUT" : "MADE TO ORDER"}
                    </span>
                    <strong>{formatCurrency(item.price_minor)}</strong>
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.description || "Freshly prepared by the restaurant."}</p>
                  <div className="dish-card__footer">
                    <small>{soldOut ? "Currently unavailable" : `${item.available_inventory} portions left`}</small>
                    <div className="quantity-control" aria-label={`${item.name} quantity`}>
                      <button
                        aria-label={`Remove one ${item.name}`}
                        disabled={quantity === 0}
                        onClick={() => onQuantityChange(item.id, quantity - 1)}
                        type="button"
                      >−</button>
                      <span aria-live="polite">{quantity}</span>
                      <button
                        aria-label={`Add one ${item.name}`}
                        disabled={soldOut || quantity >= item.available_inventory}
                        onClick={() => onQuantityChange(item.id, quantity + 1)}
                        type="button"
                      >+</button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CheckoutPanel({
  menuItems,
  cart,
  deliveryDetails,
  setDeliveryDetails,
  onSubmit,
  loading,
  onClearCart,
}) {
  const cartItems = menuItems
    .filter((item) => (cart[item.id] ?? 0) > 0)
    .map((item) => ({ ...item, quantity: cart[item.id], lineTotal: item.price_minor * cart[item.id] }));
  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = cartItems.length > 0 ? DELIVERY_FEE_MINOR : 0;

  return (
    <form className="checkout-panel" onSubmit={onSubmit}>
      <div className="checkout-panel__top">
        <p className="hero-kicker">THE GOOD STUFF</p>
        <span aria-hidden="true" className="checkout-spark">✳</span>
      </div>
      <PanelHeading
        title="Your bag"
        description={cartItems.length ? `${cartItems.length} ${cartItems.length === 1 ? "dish" : "dishes"}` : "Your bag is empty"}
      />
      {cartItems.length === 0 ? (
        <div className="empty-state empty-state--short">
          <p>Add a dish from the menu to get started.</p>
        </div>
      ) : (
        <>
          <div className="bag-items">
            {cartItems.map((item) => (
              <div className="bag-row" key={item.id}>
                <span>{item.name} <small>× {item.quantity}</small></span>
                <strong>{formatCurrency(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
          <label className="field">
            <span>Delivery address</span>
            <textarea
              required
              rows="2"
              value={deliveryDetails.deliveryAddress}
              onChange={(event) => setDeliveryDetails((current) => ({
                ...current,
                deliveryAddress: event.target.value,
              }))}
            />
          </label>
          <details className="location-details">
            <summary>Delivery location (advanced)</summary>
            <p className="field-hint">Used to estimate delivery and assign a nearby courier.</p>
            <div className="location-fields">
              <label className="field">
                <span>Latitude</span>
                <input
                  max="90"
                  min="-90"
                  required
                  type="number"
                  step="any"
                  value={deliveryDetails.deliveryLatitude}
                  onChange={(event) => setDeliveryDetails((current) => ({
                    ...current,
                    deliveryLatitude: event.target.value,
                  }))}
                />
              </label>
              <label className="field">
                <span>Longitude</span>
                <input
                  max="180"
                  min="-180"
                  required
                  type="number"
                  step="any"
                  value={deliveryDetails.deliveryLongitude}
                  onChange={(event) => setDeliveryDetails((current) => ({
                    ...current,
                    deliveryLongitude: event.target.value,
                  }))}
                />
              </label>
            </div>
          </details>
          <div className="price-summary">
            <div className="bag-row"><span>Food</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="bag-row"><span>Delivery</span><span>{formatCurrency(deliveryFee)}</span></div>
            <div className="bag-row bag-row--total"><strong>Total to pay</strong><strong>{formatCurrency(subtotal + deliveryFee)}</strong></div>
          </div>
          <button className="button button--primary button--full" disabled={loading} type="submit">
            {loading ? "Placing order…" : "Place order"}
          </button>
          <button className="text-button" onClick={onClearCart} type="button">Clear bag</button>
        </>
      )}
    </form>
  );
}

function OrderDetails({
  user,
  order,
  events,
  socketState,
  actionLoading,
  onStatusChange,
  courierDraft,
  setCourierDraft,
  onCourierUpdate,
}) {
  if (!order) {
    return (
      <section className="panel order-details">
        <PanelHeading title="Order details" description="Select an order to see what happens next." />
        <div className="empty-state">
          <strong>No order selected</strong>
          <p>
            {user.role === "delivery_partner"
              ? "New deliveries will appear here. You can update your location below."
              : "Your order status and next steps will appear here."}
          </p>
        </div>
        {user.role === "delivery_partner" ? (
          <CourierLocationPanel
            courierDraft={courierDraft}
            loading={actionLoading}
            onCourierUpdate={onCourierUpdate}
            setCourierDraft={setCourierDraft}
          />
        ) : null}
      </section>
    );
  }
  const actions = nextActionsFor(user.role, order.status);
  const sortedEvents = [...events].sort(
    (left, right) => new Date(left.created_at) - new Date(right.created_at),
  );
  const liveCopy = socketState === "open"
    ? "Updates appear automatically."
    : "Live connection is starting; refresh if the status seems out of date.";

  return (
    <section className="panel order-details">
      <PanelHeading
        title="Order details"
        description={`Order #${order.id.slice(0, 8)} · ${formatCurrency(order.total_minor)}`}
      />
      <div className="order-status">
        <span className="status-dot" />
        <div>
          <strong>{statusLabel(order.status)}</strong>
          <p className="muted">{liveCopy}</p>
        </div>
      </div>
      {user.role === "restaurant" ? (
        <div className="assignment-summary">
          <span>Assigned delivery partner</span>
          <strong>
            {order.delivery_partner_name
              ? order.delivery_partner_name
              : order.status === "cancelled"
                ? "Not required — order cancelled"
                : order.status === "delivered"
                  ? "Assignment not recorded"
                  : "Not assigned yet"}
          </strong>
        </div>
      ) : null}
      {user.role === "delivery_partner" ? (
        <section className="delivery-outcome" aria-live="polite">
          <p className="kicker">Delivery outcome</p>
          <strong className={`delivery-outcome__status delivery-outcome__status--${order.status}`}>
            {order.status === "delivered"
              ? "Delivered"
              : order.status === "cancelled"
                ? "Cancelled"
                : order.status === "out_for_delivery"
                  ? "On the way"
                  : "Waiting for restaurant dispatch"}
          </strong>
          <ul className="delivery-items">
            {order.items.map((item) => (
              <li key={item.menu_item_id}>
                <span>{item.menu_item_name}</span>
                <strong>× {item.quantity}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <StatusTimeline currentStatus={order.status} />
      {sortedEvents.length > 0 ? (
        <details className="activity-details">
          <summary>Order activity</summary>
          <ol className="activity-list">
            {sortedEvents.map((event, index) => (
              <li key={`${event.status}-${event.created_at}-${index}`}>
                <strong>{statusLabel(event.status)}</strong>
                <span>{event.metadata?.live_message || new Date(event.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      {user.role === "restaurant" && actions.length > 0 ? (
        <div className="next-step">
          <p className="kicker">Next step</p>
          <p className="muted">
            {order.status === "placed"
              ? "Accept this order to let the customer know you’re preparing it."
              : order.status === "confirmed"
                ? "Mark the order as being prepared when the kitchen starts."
                : "Mark it out for delivery when it leaves the kitchen."}
          </p>
          <div className="action-buttons">
            {actions.map((action) => (
              <button
                className={`button ${action === "cancelled" ? "button--danger" : "button--primary"}`}
                disabled={actionLoading}
                key={action}
                onClick={() => onStatusChange(action)}
                type="button"
              >
                {action === "cancelled" ? "Cancel order" : action === "confirmed" ? "Accept order" : action === "preparing" ? "Start preparing" : "Send for delivery"}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {user.role === "delivery_partner" ? (
        <div className="next-step">
          <p className="kicker">Delivery update</p>
          {order.status === "out_for_delivery" ? (
            <button
              className="button button--primary"
              disabled={actionLoading}
              onClick={() => onStatusChange("delivered")}
              type="button"
            >
              Mark as delivered
            </button>
          ) : order.status === "delivered" ? (
            <p className="muted">This delivery is complete. It remains listed in your delivery history.</p>
          ) : order.status === "cancelled" ? (
            <p className="muted">This order was cancelled and remains listed in your delivery history.</p>
          ) : (
            <p className="muted">Waiting for the restaurant to dispatch this order. Delivery actions appear after dispatch.</p>
          )}
          <CourierLocationPanel
            courierDraft={courierDraft}
            loading={actionLoading}
            onCourierUpdate={onCourierUpdate}
            setCourierDraft={setCourierDraft}
          />
        </div>
      ) : null}
    </section>
  );
}

export default function App() {
  const storedSession = useMemo(() => readStoredSession(), []);
  const [token, setToken] = useState(storedSession?.token ?? "");
  const [user, setUser] = useState(storedSession?.user ?? null);
  const [loginForm, setLoginForm] = useState({
    email: DEMO_ACCOUNTS[0].email,
    password: DEMO_ACCOUNTS[0].password,
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState({});
  const [deliveryDetails, setDeliveryDetails] = useState(INITIAL_DELIVERY);
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [events, setEvents] = useState([]);
  const [availablePartners, setAvailablePartners] = useState(null);
  const [courierDraft, setCourierDraft] = useState({
    latitude: 12.9756,
    longitude: 77.6387,
    is_available: true,
  });
  const [errorMessage, setErrorMessage] = useState("");
  const { messages, socketState } = useOrderSocket(selectedOrderId, token);

  function syncMenuItems(items) {
    setMenuItems(items);
    setCart((current) => {
      const inventoryById = new Map(items.map((item) => [item.id, item.is_available ? item.available_inventory : 0]));
      return Object.fromEntries(
        Object.entries(current)
          .map(([itemId, quantity]) => [itemId, Math.min(quantity, inventoryById.get(itemId) ?? 0)])
          .filter(([, quantity]) => quantity > 0),
      );
    });
  }

  useEffect(() => {
    let active = true;
    fetchRestaurants()
      .then((data) => {
        if (!active) return;
        setRestaurants(data);
        if (data.length > 0) setSelectedRestaurantId(data[0].id);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedRestaurantId) {
      setMenuItems([]);
      return;
    }
    let active = true;
    setMenuLoading(true);
    fetchMenu(selectedRestaurantId)
      .then((data) => {
        if (active) syncMenuItems(data);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message);
      })
      .finally(() => {
        if (active) setMenuLoading(false);
      });
    return () => { active = false; };
  }, [selectedRestaurantId]);

  useEffect(() => {
    if (!token) {
      localStorage.removeItem(SESSION_KEY);
    } else if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
    }
  }, [token, user]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchCurrentUser(token)
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch(() => {
        if (active) {
          setToken("");
          setUser(null);
        }
      });
    return () => { active = false; };
  }, [token]);

  const refreshOrders = useCallback(async () => {
    if (!token) return;
    setOrdersLoading(true);
    try {
      const data = await fetchOrders(token);
      setOrders(data);
      setSelectedOrderId((current) => (
        current && data.some((order) => order.id === current) ? current : data[0]?.id ?? ""
      ));
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setOrdersLoading(false);
    }
  }, [token]);

  const refreshPartnerAvailability = useCallback(async () => {
    if (!token || user?.role !== "restaurant") {
      setAvailablePartners(null);
      return;
    }
    try {
      const result = await fetchDeliveryAvailability(token);
      setAvailablePartners(result.available_partners);
    } catch (error) {
      setAvailablePartners(null);
      setErrorMessage(error.message);
    }
  }, [token, user?.role]);

  const refreshWorkspace = useCallback(async () => {
    await Promise.all([refreshOrders(), refreshPartnerAvailability()]);
  }, [refreshOrders, refreshPartnerAvailability]);

  useEffect(() => {
    if (!token || !user) {
      setOrders([]);
      setSelectedOrderId("");
      setSelectedOrder(null);
      setEvents([]);
      setAvailablePartners(null);
      return;
    }
    refreshWorkspace();
  }, [refreshWorkspace, token, user]);

  useEffect(() => {
    if (!token || !selectedOrderId) {
      setSelectedOrder(null);
      setEvents([]);
      return;
    }
    let active = true;
    Promise.all([
      fetchOrder({ token, orderId: selectedOrderId }),
      fetchOrderEvents({ token, orderId: selectedOrderId }),
    ])
      .then(([order, history]) => {
        if (!active) return;
        setSelectedOrder(order);
        setEvents(history);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message);
      });
    return () => { active = false; };
  }, [selectedOrderId, token]);

  useEffect(() => {
    const latestMessage = messages.at(-1);
    if (!latestMessage?.status) return;
    setSelectedOrder((current) => current && current.id === latestMessage.order_id
      ? {
          ...current,
          status: latestMessage.status,
          delivery_partner_id: latestMessage.delivery_partner_id ?? current.delivery_partner_id,
          eta_minutes: latestMessage.eta_minutes ?? current.eta_minutes,
        }
      : current);
    setOrders((current) => current.map((order) => (
      order.id === latestMessage.order_id
        ? { ...order, status: latestMessage.status }
        : order
    )));
    setEvents((current) => (
      current.at(-1)?.created_at === latestMessage.emitted_at
        ? current
        : [...current, {
            status: latestMessage.status,
            actor_user_id: null,
            metadata: { live_message: latestMessage.message },
            created_at: latestMessage.emitted_at,
          }]
    ));
  }, [messages]);

  function handleQuantityChange(itemId, quantity) {
    const item = menuItems.find((menuItem) => menuItem.id === itemId);
    if (!item) return;
    setCart((current) => ({
      ...current,
      [itemId]: Math.max(0, Math.min(quantity, item.available_inventory)),
    }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    setErrorMessage("");
    setLoginLoading(true);
    try {
      const response = await login(loginForm);
      setToken(response.access_token);
      setUser(response.user);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handlePlaceOrder(event) {
    event.preventDefault();
    const cartItems = menuItems.filter((item) => (cart[item.id] ?? 0) > 0);
    if (cartItems.length === 0) {
      setErrorMessage("Add at least one available dish before placing an order.");
      return;
    }
    setActionLoading(true);
    setErrorMessage("");
    try {
      const createdOrder = await placeOrder({
        token,
        payload: {
          restaurant_id: selectedRestaurantId,
          delivery_address: deliveryDetails.deliveryAddress,
          delivery_latitude: Number(deliveryDetails.deliveryLatitude),
          delivery_longitude: Number(deliveryDetails.deliveryLongitude),
          items: cartItems.map((item) => ({ menu_item_id: item.id, quantity: cart[item.id] })),
        },
      });
      setCart({});
      setOrders((current) => [createdOrder, ...current]);
      setSelectedOrderId(createdOrder.id);
      setSelectedOrder(createdOrder);
      setEvents([]);
      syncMenuItems(await fetchMenu(selectedRestaurantId));
    } catch (error) {
      setErrorMessage(error.message);
      if (error.message.toLowerCase().includes("inventory") || error.message.toLowerCase().includes("available")) {
        try {
          syncMenuItems(await fetchMenu(selectedRestaurantId));
        } catch (refreshError) {
          setErrorMessage(`${error.message} Menu refresh failed: ${refreshError.message}`);
        }
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStatusChange(nextStatus) {
    if (!selectedOrderId) return;
    setActionLoading(true);
    setErrorMessage("");
    try {
      const updatedOrder = await updateOrderStatus({ token, orderId: selectedOrderId, status: nextStatus });
      setSelectedOrder((current) => current ? { ...current, ...updatedOrder } : updatedOrder);
      setOrders((current) => current.map((order) => (
        order.id === updatedOrder.id ? { ...order, status: updatedOrder.status } : order
      )));
      setEvents(await fetchOrderEvents({ token, orderId: selectedOrderId }));
      if (user.role === "restaurant") await refreshPartnerAvailability();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCourierUpdate() {
    setActionLoading(true);
    setErrorMessage("");
    try {
      await updateCourierLocation({
        token,
        payload: {
          latitude: Number(courierDraft.latitude),
          longitude: Number(courierDraft.longitude),
          is_available: courierDraft.is_available,
        },
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  function handleLogout() {
    setToken("");
    setUser(null);
    setOrders([]);
    setSelectedOrderId("");
    setSelectedOrder(null);
    setEvents([]);
    setCart({});
    setErrorMessage("");
  }

  function handleRestaurantChange(restaurantId) {
    setSelectedRestaurantId(restaurantId);
    setCart({});
  }

  if (!user) {
    return (
      <AuthScreen
        error={errorMessage}
        loading={loginLoading}
        loginForm={loginForm}
        onChange={(key, value) => setLoginForm((current) => ({ ...current, [key]: value }))}
        onDemoFill={setLoginForm}
        onSubmit={handleLogin}
      />
    );
  }

  const isCustomer = user.role === "customer";
  return (
    <div className="app-shell">
      <AppHeader
        onLogout={handleLogout}
        selectedOrderId={selectedOrderId}
        socketState={socketState}
        user={user}
      />
      <main className="page">
        <PageIntro
          error={errorMessage}
          onDismissError={() => setErrorMessage("")}
          orders={orders}
          user={user}
        />
        {isCustomer ? (
          <>
            <CustomerHero user={user} />
            <div className="customer-layout">
              <MenuPanel
                cart={cart}
                menuItems={menuItems}
                menuLoading={menuLoading}
                onQuantityChange={handleQuantityChange}
                onRestaurantChange={handleRestaurantChange}
                restaurants={restaurants}
                selectedRestaurantId={selectedRestaurantId}
              />
              <CheckoutPanel
                cart={cart}
                deliveryDetails={deliveryDetails}
                loading={actionLoading}
                menuItems={menuItems}
                onClearCart={() => setCart({})}
                onSubmit={handlePlaceOrder}
                setDeliveryDetails={setDeliveryDetails}
              />
            </div>
            <div className="orders-layout" id="my-orders">
              <OrderList
                customer
                loading={ordersLoading}
                onRefresh={refreshOrders}
                onSelect={setSelectedOrderId}
                orders={orders}
                selectedOrderId={selectedOrderId}
              />
              <OrderDetails
                actionLoading={actionLoading}
                courierDraft={courierDraft}
                events={events}
                onCourierUpdate={handleCourierUpdate}
                onStatusChange={handleStatusChange}
                setCourierDraft={setCourierDraft}
                socketState={socketState}
                user={user}
                order={selectedOrder}
              />
            </div>
          </>
        ) : (
          <div className="orders-layout orders-layout--staff" id="my-orders">
            <OrderList
              availablePartners={availablePartners}
              deliveryPartner={user.role === "delivery_partner"}
              loading={ordersLoading}
              onRefresh={refreshWorkspace}
              onSelect={setSelectedOrderId}
              orders={orders}
              selectedOrderId={selectedOrderId}
            />
            <OrderDetails
              actionLoading={actionLoading}
              courierDraft={courierDraft}
              events={events}
              onCourierUpdate={handleCourierUpdate}
              onStatusChange={handleStatusChange}
              setCourierDraft={setCourierDraft}
              socketState={socketState}
              user={user}
              order={selectedOrder}
            />
          </div>
        )}
      </main>
    </div>
  );
}
