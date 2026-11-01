import { useEffect, useState, type ReactNode } from 'react';

type Props<T> = {
  title: string;
  description: string;
  emptyMessage: string;
  loadItems: () => Promise<T[]>;
  renderItem: (item: T) => ReactNode;
};

export function CapabilityCard<T>({ title, description, emptyMessage, loadItems, renderItem }: Props<T>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadItems().then((result) => {
      if (active) setItems(result);
    }).catch((requestError: unknown) => {
      if (active) {
        const message = requestError instanceof Error ? requestError.message : String(requestError);
        setError(`Unable to load ${title.toLowerCase()}. ${message}`);
      }
    });

    return () => {
      active = false;
    };
  }, [loadItems, title]);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">{title}</h2>
    <p>{description}</p>
    {items === null && error === null && <p role="status">Loading {title.toLowerCase()}...</p>}
    {error !== null && <p role="alert">{error}</p>}
    {items !== null && items.length === 0 && <p role="status">{emptyMessage}</p>}
    {items !== null && items.length > 0 && <ul className="list-group">
      {items.map((item, index) => <li className="list-group-item" key={index}>{renderItem(item)}</li>)}
    </ul>}
  </div></section>;
}
