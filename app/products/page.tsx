'use client';

import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ProductsRegistry from '../cadastros/registries/ProductsRegistry';

export default function ProductsPage() {
  return (
    <LoggedLayout>
      <ProductsRegistry />
    </LoggedLayout>
  );
}
