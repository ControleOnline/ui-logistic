const normalizeText = value => String(value || '').trim();

export const isPreparingDeliveryStatus = status => {
  const statusLabel = normalizeText(status?.status).toLowerCase();
  const realStatus = normalizeText(status?.realStatus).toLowerCase();

  return (
    normalizeText(status?.context).toLowerCase() === 'delivery' &&
    (statusLabel.includes('prepar') || realStatus.includes('prepar'))
  );
};

export const filterDeliveryStatusItems = statusItems =>
  (Array.isArray(statusItems) ? statusItems : []).filter(
    item =>
      normalizeText(item?.context).toLowerCase() === 'delivery' &&
      !isPreparingDeliveryStatus(item),
  );
