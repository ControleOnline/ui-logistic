/*
 * Contract imported from MODOS_OPERACAO.md
 * - DELIVERY rate screens read group collections only through scoped backend queries.
 * - The hooks centralize loading for courier and manager rate screens.
 * - Vehicle onboarding uses its own dedicated courier vehicle collection with rich identity fields.
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIsFocused} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';
import {normalizeText} from '@controleonline/ui-logistic/src/shared/deliveryTaxGroups';

export const normalizeDeliveryCourierVehicle = vehicle => {
  const normalizedYear = Number.parseInt(String(vehicle?.year ?? vehicle?.vehicleYear ?? ''), 10);
  const normalizedPlate = normalizeText(vehicle?.plate || vehicle?.licensePlate || '')
    .replace(/\s+/g, '')
    .toUpperCase();

  return {
    '@id': vehicle?.['@id'] || null,
    id: vehicle?.id ?? null,
    courier: vehicle?.courier || null,
    vehicleType: normalizeText(vehicle?.vehicleType) || 'moto',
    brand: normalizeText(vehicle?.brand),
    model: normalizeText(vehicle?.model),
    plate: normalizedPlate,
    year: Number.isFinite(normalizedYear) ? normalizedYear : null,
    color: normalizeText(vehicle?.color),
    creationDate: vehicle?.creationDate || null,
    alterDate: vehicle?.alterDate || null,
  };
};

export const isDeliveryCourierVehicleComplete = vehicle =>
  Boolean(normalizeText(vehicle?.vehicleType)) &&
  Boolean(normalizeText(vehicle?.brand)) &&
  Boolean(normalizeText(vehicle?.model)) &&
  Boolean(normalizeText(vehicle?.plate)) &&
  Number.isFinite(Number(vehicle?.year)) &&
  Number(vehicle.year) > 0;

export const useDeliveryRateGroupsCollection = (query = {}, enabled = true) => {
  const isFocused = useIsFocused();
  const deliveryRateGroupsStore = useStore('delivery_tax_groups');
  const {actions, getters} = deliveryRateGroupsStore;

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const queryKey = useMemo(() => JSON.stringify(query || {}), [query]);

  const reload = useCallback(async () => {
    if (!enabled || !isFocused || typeof actions.getItems !== 'function') {
      return [];
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError('');

    try {
      const response = await actions.getItems(query);
      if (requestId !== requestIdRef.current) {
        return Array.isArray(response) ? response : [];
      }

      const normalizedItems = Array.isArray(response) ? response : [];
      setItems(normalizedItems);
      return normalizedItems;
    } catch (caughtError) {
      if (requestId === requestIdRef.current) {
        setError(caughtError?.message || 'Não foi possível carregar as tabelas de entrega.');
      }

      return [];
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [actions, enabled, isFocused, query]);

  useEffect(() => {
    if (!enabled || !isFocused) {
      return;
    }

    reload();
  }, [enabled, isFocused, queryKey, reload]);

  return {
    error,
    items,
    isLoading,
    reload,
    totalItems: Number(getters.totalItems || items.length || 0),
  };
};

export const useDeliveryRateGroupItem = (id, enabled = true) => {
  const isFocused = useIsFocused();
  const deliveryRateGroupsStore = useStore('delivery_tax_groups');
  const {actions} = deliveryRateGroupsStore;

  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const normalizedId = useMemo(() => String(id || '').replace(/\D+/g, ''), [id]);

  const reload = useCallback(async () => {
    if (!enabled || !isFocused || !normalizedId || typeof actions.get !== 'function') {
      return null;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError('');

    try {
      const response = await actions.get(normalizedId);
      if (requestId !== requestIdRef.current) {
        return response;
      }

      setItem(response || null);
      return response || null;
    } catch (caughtError) {
      if (requestId === requestIdRef.current) {
        setError(caughtError?.message || 'Não foi possível carregar a tabela de entrega.');
      }

      return null;
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [actions, enabled, isFocused, normalizedId]);

  useEffect(() => {
    if (!enabled || !isFocused || !normalizedId) {
      return;
    }

    reload();
  }, [enabled, isFocused, normalizedId, reload]);

  return {
    error,
    item,
    isLoading,
    reload,
    normalizedId,
  };
};

export const useDeliveryCourierVehiclesCollection = (query = {}, enabled = true) => {
  const isFocused = useIsFocused();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const queryKey = useMemo(() => JSON.stringify(query || {}), [query]);

  const normalizeCollectionResponse = response =>
    response?.member ||
    response?.['hydra:member'] ||
    response?.response?.data ||
    response?.data ||
    [];

  const reload = useCallback(async () => {
    if (!enabled || !isFocused) {
      return [];
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError('');

    try {
      const search = new URLSearchParams();
      Object.entries(query || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          return;
        }

        search.set(key, String(value));
      });

      const endpoint = search.toString()
        ? `/delivery_courier_vehicles?${search.toString()}`
        : '/delivery_courier_vehicles';
      const response = await api.fetch(endpoint);
      if (requestId !== requestIdRef.current) {
        return [];
      }

      const normalizedItems = normalizeCollectionResponse(response);
      const mappedItems = Array.isArray(normalizedItems)
        ? normalizedItems.map(normalizeDeliveryCourierVehicle)
        : [];
      setItems(mappedItems);
      return mappedItems;
    } catch (caughtError) {
      if (requestId === requestIdRef.current) {
        setError(caughtError?.message || 'Não foi possível carregar o veículo do motoboy.');
      }

      return [];
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, isFocused, query]);

  useEffect(() => {
    if (!enabled || !isFocused) {
      return;
    }

    reload();
  }, [enabled, isFocused, queryKey, reload]);

  return {
    error,
    items,
    isLoading,
    reload,
    totalItems: items.length,
  };
};
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
