export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }) {
  return (
    <div className={`mb-2 border-b pb-2 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }) {
  return (
    <h2 className={`text-xl font-semibold leading-tight ${className}`}>
      {children}
    </h2>
  );
}

export function CardContent({ children, className = "" }) {
  return (
    <div className={`p-2 ${className}`}>
      {children}
    </div>
  );
}
