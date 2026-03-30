import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Empresa } from "../types";
import {
ResponsiveContainer,
LineChart,
Line,
XAxis,
YAxis,
Tooltip,
} from "recharts";

interface DashboardScreenProps {
empresa: Empresa;
}

export function DashboardScreen({ empresa }: DashboardScreenProps) {

const [stats, setStats] = useState({
facturas: 0,
facturado: 0,
cobrado: 0,
pendiente: 0,
});

const [selectedMonth, setSelectedMonth] = useState(
new Date().toISOString().slice(0, 7)
);

const [chartData, setChartData] = useState<any[]>([]);
const [latestInvoices, setLatestInvoices] = useState<any[]>([]);

const loadStats = async () => {
if (!empresa?.id) return;


const { data, error } = await supabase.rpc("dashboard_stats", {
  p_empresa_id: empresa.id,
  p_month: selectedMonth,
});

if (error) return console.error(error);

if (data && data.length > 0) {
  setStats({
    facturas: Number(data[0].facturas),
    facturado: Number(data[0].facturado),
    cobrado: Number(data[0].cobrado),
    pendiente: Number(data[0].pendiente),
  });
}


};

const loadChart = async () => {
if (!empresa?.id) return;


const { data, error } = await supabase
  .from("facturas")
  .select("fecha,total")
  .eq("empresa_id", empresa.id)
  .order("fecha");

if (error) return console.error(error);

const grouped: any = {};

data?.forEach((f) => {
  const day = f.fecha;

  if (!grouped[day]) grouped[day] = 0;

  grouped[day] += Number(f.total);
});

const result = Object.keys(grouped).map((d) => ({
  fecha: d,
  total: grouped[d],
}));

setChartData(result);


};

const loadLatestInvoices = async () => {
if (!empresa?.id) return;


const { data, error } = await supabase
  .from("facturas")
  .select("id,numero,fecha,total,estado")
  .eq("empresa_id", empresa.id)
  .order("fecha", { ascending: false })
  .limit(5);

if (error) return console.error(error);

setLatestInvoices(data || []);


};

useEffect(() => {
loadStats();
loadChart();
loadLatestInvoices();
}, [empresa?.id, selectedMonth]);

return ( <div className="space-y-6">


  {/* Header */}

  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

    <h1 className="text-xl sm:text-2xl font-bold">
      Dashboard
    </h1>

    <input
      type="month"
      value={selectedMonth}
      onChange={(e) => setSelectedMonth(e.target.value)}
      className="border rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
    />

  </div>

  {/* Stats */}

  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

    <Card title="Facturas" value={stats.facturas} />

    <Card
      title="Facturado"
      value={`${stats.facturado.toFixed(2)} €`}
    />

    <Card
      title="Cobrado"
      value={`${stats.cobrado.toFixed(2)} €`}
    />

    <Card
      title="Pendiente"
      value={`${stats.pendiente.toFixed(2)} €`}
    />

  </div>

  {/* Chart */}

  <div className="bg-white p-4 rounded-xl border shadow-sm">

    <h2 className="font-semibold mb-4">
      Facturación
    </h2>

    <div className="h-64">

      <ResponsiveContainer width="100%" height="100%">

        <LineChart data={chartData}>

          <XAxis dataKey="fecha" />

          <YAxis />

          <Tooltip />

          <Line
            type="monotone"
            dataKey="total"
            stroke="#2563eb"
            strokeWidth={3}
          />

        </LineChart>

      </ResponsiveContainer>

    </div>

  </div>

  {/* Latest invoices */}

  <div className="bg-white p-4 rounded-xl border shadow-sm">

    <h2 className="font-semibold mb-4">
      Últimas facturas
    </h2>

    <div className="space-y-3">

      {latestInvoices.map((f) => (

        <div
          key={f.id}
          className="flex justify-between text-sm border-b pb-2"
        >

          <div>

            <div className="font-medium">
              #{f.numero}
            </div>

            <div className="text-gray-500">
              {f.fecha}
            </div>

          </div>

          <div className="text-right">

            <div className="font-semibold">
              {Number(f.total).toFixed(2)} €
            </div>

            <div className="text-gray-500">
              {f.estado}
            </div>

          </div>

        </div>

      ))}

    </div>

  </div>

</div>


);
}

function Card({ title, value }: { title: string; value: string | number }) {
return ( <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition">


  <div className="text-gray-500 text-xs sm:text-sm font-medium">
    {title}
  </div>

  <div className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2 text-gray-900">
    {value}
  </div>

</div>


);
}
