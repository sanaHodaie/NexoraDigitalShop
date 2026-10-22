import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { useShop } from './ShopContext';
import { addComparison, comparisonIds } from '../lib/comparison';

const Context = createContext(null);
const KEY = 'nexora:compare:v1';
function initialState() {
  try { return { ids: comparisonIds(JSON.parse(localStorage.getItem(KEY))), error: '' }; }
  catch { return { ids: [], error: '' }; }
}
function reducer(state, action) {
  if (action.type === 'clear') return { ids: [], error: '' };
  if (action.type === 'remove') return { ids: state.ids.filter(id => id !== action.id), error: '' };
  if (action.type === 'dismiss') return { ...state, error: '' };
  if (action.type === 'replace') return addComparison(state.ids.filter(id => id !== action.id), action.product, action.catalog);
  return addComparison(state.ids, action.product, action.catalog);
}
export function CompareProvider({ children }) {
  const { allProducts } = useShop();
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state.ids)); } catch { /* Optional local storage. */ } }, [state.ids]);
  const remove = id => dispatch({ type: 'remove', id });
  return <Context.Provider value={{ ...state,
    products: state.ids.map(id => allProducts.find(product => product.id === id)).filter(Boolean),
    add: product => dispatch({ type: 'add', product, catalog: allProducts }),
    replace: (id, product) => dispatch({ type: 'replace', id, product, catalog: allProducts }),
    toggle: product => state.ids.includes(product.id) ? remove(product.id) : dispatch({ type: 'add', product, catalog: allProducts }),
    remove, clear: () => dispatch({ type: 'clear' }), dismiss: () => dispatch({ type: 'dismiss' }),
  }}>{children}</Context.Provider>;
}
export const useCompare = () => useContext(Context);
