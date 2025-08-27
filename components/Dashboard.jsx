import React from "react";
import { Card, CardContent } from "./ui/card";

export default function Dashboard() {
  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-100 min-h-screen">
      <Card className="col-span-1">
        <CardContent>
          <h2 className="text-lg font-semibold">Saldo Total</h2>
          <p className="text-2xl text-green-600 font-bold">R$ 14.515,00</p>
          <p className="text-blue-600">R$ 241,92 Média Mensal</p>
        </CardContent>
      </Card>
      <Card className="col-span-1">
        <CardContent>
          <h2 className="text-lg font-semibold">Total de Dias</h2>
          <p className="text-2xl">886</p>
          <div className="flex justify-between mt-2">
            <span className="text-green-600">478 Dias Positivos</span>
            <span className="text-red-500">408 Dias Negativos</span>
          </div>
        </CardContent>
      </Card>
      <Card className="col-span-1">
        <CardContent>
          <h2 className="text-lg font-semibold">Fator de Lucro</h2>
          <p className="text-2xl">1.47</p>
          <div className="text-sm mt-2">
            <p>53.95% Taxa Acerto</p>
            <p>0.12 Índice Sharpe</p>
          </div>
        </CardContent>
      </Card>
      <Card className="col-span-1">
        <CardContent>
          <h2 className="text-lg font-semibold">Payoff</h2>
          <p className="text-2xl">1.25</p>
          <div className="text-sm mt-2">
            <p>R$ 95,56 Média Dias Positivos</p>
            <p>R$ -76,38 Média Dias Negativos</p>
          </div>
        </CardContent>
      </Card>
      <Card className="col-span-1">
        <CardContent>
          <h2 className="text-lg font-semibold">Drawdown Máximo</h2>
          <p className="text-2xl text-red-600">R$ -1.170,00</p>
          <p className="text-sm text-gray-600">16/11/2017 - 03/04/2018</p>
        </CardContent>
      </Card>
      <Card className="col-span-1">
        <CardContent>
          <h2 className="text-lg font-semibold">Maior Loss Diário</h2>
          <p className="text-2xl text-red-600">R$ -390,00</p>
          <p className="text-sm text-gray-600">27/12/2018</p>
        </CardContent>
      </Card>
      <Card className="col-span-full">
        <CardContent>
          <h2 className="text-lg font-semibold mb-4">Curva de Capital</h2>
          <div className="h-64 bg-white border rounded flex items-center justify-center text-gray-400">
            Gráfico de Capital Placeholder
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
