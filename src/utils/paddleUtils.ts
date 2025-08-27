export const PADDLE_PRICE_IDS = {
  basicMonthly: 'pri_01k2031dkdfgv543j9mqexxsx1',
  basicAnnual: 'pri_01k2030km2r709jt8ahcb2w3pr',
  proMonthly: 'pri_01k202xz8xr4xkcem4s29rp2hc',
  proAnnual: 'pri_01k202ws5vhw8yd3fts8y8jw66',
  proLifetime: 'pri_01k2032px4vc7nvy9vvrct6dhe'
};

export function openPaddleCheckout(priceId: string, customData?: Record<string, any>) {
  if (typeof window === 'undefined' || !(window as any).Paddle) {
    console.error('Paddle não carregado');
    return;
  }

  const payload: any = {
    items: [{ priceId, quantity: 1 }],
    settings: { theme: 'light' },
  };

  if (customData) {
    payload.customData = customData;
  }

  (window as any).Paddle.Checkout.open(payload);
}

export const getPlanNameFromPriceId = (priceId: string | null | undefined): 'basic' | 'pro' | null => {
    if (!priceId) {
        return null;
    }

    // Criamos um mapa reverso a partir dos seus IDs existentes
    const priceIdToPlanNameMap: { [key: string]: 'basic' | 'pro' } = {
        [PADDLE_PRICE_IDS.basicMonthly]: 'basic',
        [PADDLE_PRICE_IDS.basicAnnual]: 'basic',
        [PADDLE_PRICE_IDS.proMonthly]: 'pro',
        [PADDLE_PRICE_IDS.proAnnual]: 'pro',
        [PADDLE_PRICE_IDS.proLifetime]: 'pro', 
    };

    return priceIdToPlanNameMap[priceId] || null;
};