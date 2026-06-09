import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, Lock, User } from 'lucide-react';

interface CardPaymentFormProps {
  onChange: (
    cardData: { number: string; expiry: string; cvv: string; name: string },
    isValid: boolean
  ) => void;
}

const luhnCheck = (num: string): boolean => {
  const clean = num.replace(/\D/g, '');
  if (clean.length !== 16) return false;
  let sum = 0;
  for (let i = 0; i < clean.length; i++) {
    let digit = parseInt(clean[i], 10);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
};

export default function CardPaymentForm({ onChange }: CardPaymentFormProps) {
  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const [errors, setErrors] = useState<{
    name?: string;
    number?: string;
    expiry?: string;
    cvv?: string;
  }>({});

  const [touched, setTouched] = useState<{
    name?: boolean;
    number?: boolean;
    expiry?: boolean;
    cvv?: boolean;
  }>({});

  const handleBlur = (field: 'name' | 'number' | 'expiry' | 'cvv') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const formatCardNumber = (value: string) => {
    const clean = value.replace(/\D/g, '').substring(0, 16);
    const parts = [];
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.substring(i, i + 4));
    }
    return parts.join(' ');
  };

  const formatExpiry = (value: string) => {
    const clean = value.replace(/\D/g, '').substring(0, 4);
    if (clean.length >= 2) {
      return `${clean.substring(0, 2)}/${clean.substring(2)}`;
    }
    return clean;
  };

  const validate = () => {
    const tempErrors: typeof errors = {};
    let isValid = true;

    if (!name.trim()) {
      tempErrors.name = 'Nome intestatario richiesto';
      isValid = false;
    }

    const cleanNum = cardNumber.replace(/\D/g, '');
    if (cleanNum.length !== 16) {
      tempErrors.number = 'Inserisci 16 cifre';
      isValid = false;
    } else if (!luhnCheck(cleanNum)) {
      tempErrors.number = 'Numero di carta non valido (Luhn check fallito)';
      isValid = false;
    }

    const cleanExpiry = expiry.replace(/\D/g, '');
    if (cleanExpiry.length !== 4) {
      tempErrors.expiry = 'Formato MM/YY richiesto';
      isValid = false;
    } else {
      const month = parseInt(cleanExpiry.substring(0, 2), 10);
      const year = parseInt(cleanExpiry.substring(2), 10);
      const currentYear = parseInt(new Date().getFullYear().toString().substring(2), 10);
      const currentMonth = new Date().getMonth() + 1;

      if (month < 1 || month > 12) {
        tempErrors.expiry = 'Mese non valido';
        isValid = false;
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        tempErrors.expiry = 'Carta scaduta';
        isValid = false;
      }
    }

    const cleanCvv = cvv.replace(/\D/g, '');
    if (cleanCvv.length < 3 || cleanCvv.length > 4) {
      tempErrors.cvv = 'Richiesto CVV a 3 o 4 cifre';
      isValid = false;
    }

    setErrors(tempErrors);
    return isValid;
  };

  useEffect(() => {
    const isValid = validate();
    onChange({ number: cardNumber, expiry, cvv, name }, isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardNumber, expiry, cvv, name]);

  return (
    <div className="space-y-4 bg-muted/20 border border-border/60 rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 pb-2 border-b border-border/40 mb-2">
        <CreditCard className="text-primary w-4 h-4" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Dettagli Carta di Credito
        </h4>
      </div>

      {/* Intestatario */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Intestatario Carta
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => handleBlur('name')}
            placeholder="Nome Cognome"
            className={`w-full pl-9 pr-3.5 py-2 text-base bg-input border ${
              touched.name && errors.name ? 'border-red-500' : 'border-border'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-ring`}
          />
        </div>
        {touched.name && errors.name && (
          <p className="text-[10px] text-red-500 font-semibold">{errors.name}</p>
        )}
      </div>

      {/* Numero Carta */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Numero Carta
        </label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            inputMode="numeric"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            onBlur={() => handleBlur('number')}
            placeholder="0000 0000 0000 0000"
            className={`w-full pl-9 pr-3.5 py-2 text-base bg-input border ${
              touched.number && errors.number ? 'border-red-500' : 'border-border'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums`}
          />
        </div>
        {touched.number && errors.number && (
          <p className="text-[10px] text-red-500 font-semibold">{errors.number}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Scadenza */}
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Scadenza (MM/YY)
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              inputMode="numeric"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              onBlur={() => handleBlur('expiry')}
              placeholder="MM/YY"
              className={`w-full pl-9 pr-3.5 py-2 text-base bg-input border ${
                touched.expiry && errors.expiry ? 'border-red-500' : 'border-border'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums`}
            />
          </div>
          {touched.expiry && errors.expiry && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.expiry}</p>
          )}
        </div>

        {/* CVV */}
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            CVV / CVC
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="password"
              inputMode="numeric"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
              onBlur={() => handleBlur('cvv')}
              placeholder="•••"
              className={`w-full pl-9 pr-3.5 py-2 text-base bg-input border ${
                touched.cvv && errors.cvv ? 'border-red-500' : 'border-border'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-ring`}
            />
          </div>
          {touched.cvv && errors.cvv && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.cvv}</p>
          )}
        </div>
      </div>
    </div>
  );
}
