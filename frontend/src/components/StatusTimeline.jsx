const STATUS_LABELS = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const TRACKABLE_STATUSES = ["placed", "confirmed", "preparing", "out_for_delivery", "delivered"];

export function StatusTimeline({ currentStatus }) {
  if (currentStatus === "cancelled") {
    return (
      <ol className="timeline">
        <li className="timeline__item timeline__item--cancelled">
          <span className="timeline__dot" />
          <div>
            <p>{STATUS_LABELS.cancelled}</p>
            <small>This order was cancelled</small>
          </div>
        </li>
      </ol>
    );
  }

  const currentIndex = TRACKABLE_STATUSES.indexOf(currentStatus);

  return (
    <ol className="timeline">
      {TRACKABLE_STATUSES.map((status, index) => {
        const isComplete = index <= currentIndex;
        return (
          <li
            key={status}
            className={`timeline__item ${isComplete ? "timeline__item--complete" : ""}`}
          >
            <span className="timeline__dot" />
            <div>
              <p>{STATUS_LABELS[status]}</p>
              <small>
                {status === currentStatus ? "Current status" : index < currentIndex ? "Complete" : "Next"}
              </small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
