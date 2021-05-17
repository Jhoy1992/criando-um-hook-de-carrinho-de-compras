import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);
      const { amount } = stock;

      if (amount <= 0) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = [...cart];
      const product = newCart.find(product => product.id === productId);

      if (product) {
        if (product.amount + 1 > amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        product.amount += 1;
      }

      if (!product) {
        const { data: newProduct } = await api.get<Product>(
          `products/${productId}`
        );

        if (!newProduct) {
          toast.error("Erro na adição do produto");
          return;
        }

        newProduct.amount = 1;
        newCart.push(newProduct);
      }

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);

      if (!product) {
        throw new Error("Erro na remoção do produto");
      }

      const newCart = cart.filter(product => product.id !== productId);

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const product = cart.find(product => product.id === productId);

      if (!product) {
        throw new Error("Erro na alteração de quantidade do produto");
      }

      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      if (amount > stock.amount) {
        throw new Error("Quantidade solicitada fora de estoque");
      }

      const newCart = cart.map(product => {
        if (product.id === productId) {
          product.amount = +amount;
        }

        return product;
      });

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch (err) {
      toast.error(err.message);
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
