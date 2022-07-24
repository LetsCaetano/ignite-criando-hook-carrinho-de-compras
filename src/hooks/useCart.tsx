import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.findIndex((product) => product.id === productId)
      if (productInCart === -1) {
        const { data: product } = await api.get<Product>(`/products/${productId}`);
        const newCart = [
          ...cart,
          { ...product, amount: 1 }
        ]
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
      else {
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
        if (stock.amount <= cart[productInCart].amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        const newCart = [...cart]
        newCart[productInCart].amount += 1;
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
      toast.success("Produto adicicionado ao carrinho");
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cleanCart = cart.filter((product) => {
        return product.id !== productId
      })
      setCart(cleanCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cleanCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if(amount <= 0) return;
    try {
      const productInCart = cart.findIndex((product) => product.id === productId)
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const updatedCart = [...cart]
      updatedCart[productInCart].amount = amount;
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
