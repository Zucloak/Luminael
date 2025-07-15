"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Trash2 } from 'lucide-react';

interface DataPoint {
  name: string;
  value: number;
}

export function GraphCreator() {
  const [data, setData] = useState<DataPoint[]>([
    { name: 'A', value: 12 },
    { name: 'B', value: 19 },
    { name: 'C', value: 3 },
  ]);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const handleDataChange = (index: number, field: keyof DataPoint, newValue: string | number) => {
    const newData = [...data];
    if (field === 'value') {
      const numValue = Number(newValue);
      if (!isNaN(numValue)) {
        newData[index] = { ...newData[index], [field]: numValue };
        setData(newData);
      }
    } else {
      newData[index] = { ...newData[index], [field]: String(newValue) };
      setData(newData);
    }
  };

  const addDataPoint = () => {
    setData([...data, { name: `New`, value: Math.floor(Math.random() * 20) }]);
  };

  const removeDataPoint = (index: number) => {
    setData(data.filter((_, i) => i !== index));
  };


  const ChartComponent = chartType === 'bar' ? BarChart : LineChart;
  const ChartElement = chartType === 'bar' ? <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /> : <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />;

  return (
    <Card className="w-full border-0">
      <CardHeader>
        <CardTitle>Graph Creator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Chart</h4>
          <div className="p-4 bg-muted rounded-md h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <ChartComponent data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.5}/>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {ChartElement}
                </ChartComponent>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex gap-2">
            <Button variant={chartType === 'bar' ? 'default' : 'outline'} onClick={() => setChartType('bar')}>Bar Chart</Button>
            <Button variant={chartType === 'line' ? 'default' : 'outline'} onClick={() => setChartType('line')}>Line Chart</Button>
        </div>

        <div>
            <h4 className="font-medium mb-2">Data Points</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {data.map((point, index) => (
                <div key={index} className="flex items-center gap-2">
                    <Input
                        type="text"
                        placeholder="Label"
                        value={point.name}
                        onChange={(e) => handleDataChange(index, 'name', e.target.value)}
                        className="flex-1"
                    />
                    <Input
                        type="number"
                        placeholder="Value"
                        value={point.value}
                        onChange={(e) => handleDataChange(index, 'value', e.target.value)}
                        className="w-24"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeDataPoint(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ))}
            </div>
            <Button onClick={addDataPoint} className="mt-2" variant="outline">Add Data Point</Button>
        </div>
      </CardContent>
    </Card>
  );
}
