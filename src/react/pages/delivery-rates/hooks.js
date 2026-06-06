/*
 * Contract imported from MODOS_OPERACAO.md
 * - DELIVERY rate screens read group collections only through scoped backend queries.
 * - The hooks centralize loading for courier and manager rate screens.
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIsFocused} from '@react-navigation/native';
import {useStore} from '@store';

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
