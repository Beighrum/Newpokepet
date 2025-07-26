import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Info } from 'lucide-react';
import { RARITY_CONFIGS, RarityType, simulateRarityDistribution } from '@/services/raritySystem';
import RarityBadge from './RarityBadge';

interface RarityDistributionProps {
  actualDistribution?: Record<RarityType, number>;
  sampleSize?: number;
  showExpected?: boolean;
  showComparison?: boolean;
  className?: string;
}

const RarityDistribution: React.FC<RarityDistributionProps> = ({
  actualDistribution,
  sampleSize = 1000,
  showExpected = true,
  showComparison = false,
  className = ''
}) => {
  const expectedDistribution = React.useMemo(() => {
    return simulateRarityDistribution(sampleSize);
  }, [sampleSize]);

  const theoreticalDistribution = React.useMemo(() => {
    return Object.fromEntries(
      Object.entries(RARITY_CONFIGS).map(([rarity, config]) => [
        rarity,
        config.probability
      ])
    ) as Record<RarityType, number>;
  }, []);

  const getDistributionData = () => {
    const rarities = Object.keys(RARITY_CONFIGS) as RarityType[];
    
    return rarities.map(rarity => ({
      rarity,
      config: RARITY_CONFIGS[rarity],
      theoretical: theoreticalDistribution[rarity],
      expected: expectedDistribution[rarity],
      actual: actualDistribution?.[rarity] || 0
    }));
  };

  const distributionData = getDistributionData();

  const getVarianceColor = (actual: number, expected: number) => {
    const variance = Math.abs(actual - expected);
    if (variance < 2) return 'text-green-600';
    if (variance < 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getVarianceIcon = (actual: number, expected: number) => {
    const variance = actual - expected;
    if (Math.abs(variance) < 1) return '≈';
    return variance > 0 ? '↑' : '↓';
  };

  return (\n    <div className={`space-y-6 ${className}`}>\n      {/* Overview */}\n      <Card>\n        <CardHeader>\n          <CardTitle className=\"flex items-center\">\n            <BarChart3 className=\"w-5 h-5 mr-2 text-blue-500\" />\n            Rarity Distribution Analysis\n          </CardTitle>\n          <CardDescription>\n            {actualDistribution \n              ? `Analysis of ${Object.values(actualDistribution).reduce((sum, val) => sum + val, 0)} cards`\n              : `Expected distribution based on ${sampleSize.toLocaleString()} simulated cards`\n            }\n          </CardDescription>\n        </CardHeader>\n        <CardContent>\n          <div className=\"grid grid-cols-2 md:grid-cols-3 gap-4 mb-6\">\n            <div className=\"text-center p-4 bg-blue-50 rounded-lg\">\n              <div className=\"text-2xl font-bold text-blue-600 mb-1\">\n                {distributionData.reduce((sum, item) => sum + (actualDistribution?.[item.rarity] || item.expected), 0).toFixed(0)}\n              </div>\n              <div className=\"text-sm text-gray-600\">Total Cards</div>\n            </div>\n            \n            <div className=\"text-center p-4 bg-purple-50 rounded-lg\">\n              <div className=\"text-2xl font-bold text-purple-600 mb-1\">\n                {distributionData\n                  .filter(item => ['epic', 'legendary', 'secret_rare'].includes(item.rarity))\n                  .reduce((sum, item) => sum + (actualDistribution?.[item.rarity] || item.expected), 0)\n                  .toFixed(1)}%\n              </div>\n              <div className=\"text-sm text-gray-600\">Epic+ Rate</div>\n            </div>\n            \n            <div className=\"text-center p-4 bg-amber-50 rounded-lg\">\n              <div className=\"text-2xl font-bold text-amber-600 mb-1\">\n                {(actualDistribution?.secret_rare || expectedDistribution.secret_rare).toFixed(2)}%\n              </div>\n              <div className=\"text-sm text-gray-600\">Secret Rare Rate</div>\n            </div>\n          </div>\n        </CardContent>\n      </Card>\n\n      {/* Distribution Chart */}\n      <Card>\n        <CardHeader>\n          <CardTitle className=\"flex items-center\">\n            <TrendingUp className=\"w-5 h-5 mr-2 text-green-500\" />\n            Distribution Breakdown\n          </CardTitle>\n          {showComparison && actualDistribution && (\n            <CardDescription>\n              Comparing actual results with expected probabilities\n            </CardDescription>\n          )}\n        </CardHeader>\n        <CardContent>\n          <div className=\"space-y-6\">\n            {distributionData\n              .sort((a, b) => b.config.multiplier - a.config.multiplier)\n              .map((item) => {\n                const showActual = actualDistribution && actualDistribution[item.rarity] > 0;\n                const primaryValue = showActual ? actualDistribution[item.rarity] : item.expected;\n                \n                return (\n                  <div key={item.rarity} className=\"space-y-3\">\n                    <div className=\"flex items-center justify-between\">\n                      <div className=\"flex items-center space-x-3\">\n                        <RarityBadge rarity={item.rarity} size=\"sm\" showEffects={false} />\n                        <div>\n                          <div className=\"font-medium\">{item.config.displayName}</div>\n                          <div className=\"text-sm text-gray-500\">\n                            Theoretical: {item.theoretical.toFixed(1)}%\n                          </div>\n                        </div>\n                      </div>\n                      \n                      <div className=\"text-right\">\n                        <div className=\"text-lg font-bold\" style={{ color: item.config.color }}>\n                          {primaryValue.toFixed(1)}%\n                        </div>\n                        {showComparison && showActual && (\n                          <div className={`text-sm ${getVarianceColor(actualDistribution[item.rarity], item.expected)}`}>\n                            {getVarianceIcon(actualDistribution[item.rarity], item.expected)} \n                            {Math.abs(actualDistribution[item.rarity] - item.expected).toFixed(1)}%\n                          </div>\n                        )}\n                      </div>\n                    </div>\n                    \n                    <div className=\"space-y-2\">\n                      {/* Primary bar (actual or expected) */}\n                      <div className=\"relative\">\n                        <Progress \n                          value={primaryValue} \n                          className=\"h-3\"\n                          style={{\n                            '--progress-background': item.config.color\n                          } as React.CSSProperties}\n                        />\n                        <div className=\"absolute inset-0 flex items-center justify-center text-xs font-medium text-white\">\n                          {primaryValue > 5 && `${primaryValue.toFixed(1)}%`}\n                        </div>\n                      </div>\n                      \n                      {/* Comparison bar (theoretical) */}\n                      {showComparison && (\n                        <div className=\"relative\">\n                          <Progress \n                            value={item.theoretical} \n                            className=\"h-2 opacity-50\"\n                            style={{\n                              '--progress-background': '#94A3B8'\n                            } as React.CSSProperties}\n                          />\n                          <div className=\"absolute right-0 -top-5 text-xs text-gray-500\">\n                            Expected: {item.theoretical.toFixed(1)}%\n                          </div>\n                        </div>\n                      )}\n                    </div>\n                  </div>\n                );\n              })\n            }\n          </div>\n        </CardContent>\n      </Card>\n\n      {/* Insights */}\n      {actualDistribution && (\n        <Card>\n          <CardHeader>\n            <CardTitle className=\"flex items-center\">\n              <Info className=\"w-5 h-5 mr-2 text-blue-500\" />\n              Distribution Insights\n            </CardTitle>\n          </CardHeader>\n          <CardContent>\n            <div className=\"space-y-3\">\n              {distributionData.map((item) => {\n                const actual = actualDistribution[item.rarity];\n                const expected = item.expected;\n                const variance = actual - expected;\n                const isSignificant = Math.abs(variance) > 2;\n                \n                if (!isSignificant) return null;\n                \n                return (\n                  <div key={item.rarity} className=\"flex items-start space-x-3 p-3 bg-gray-50 rounded-lg\">\n                    <RarityBadge rarity={item.rarity} size=\"sm\" showEffects={false} />\n                    <div className=\"flex-1\">\n                      <div className=\"font-medium mb-1\">\n                        {variance > 0 ? 'Above' : 'Below'} Expected Rate\n                      </div>\n                      <div className=\"text-sm text-gray-600\">\n                        {item.config.displayName} cards are appearing {Math.abs(variance).toFixed(1)}% \n                        {variance > 0 ? 'more' : 'less'} frequently than expected. \n                        {variance > 0 \n                          ? 'You\\'re having good luck with this rarity!' \n                          : 'This rarity might be due for an uptick.'\n                        }\n                      </div>\n                    </div>\n                  </div>\n                );\n              })}\n              \n              {distributionData.every(item => \n                Math.abs((actualDistribution[item.rarity] || 0) - item.expected) <= 2\n              ) && (\n                <div className=\"text-center p-4 bg-green-50 rounded-lg\">\n                  <div className=\"text-green-700 font-medium mb-1\">\n                    Distribution is Well-Balanced!\n                  </div>\n                  <div className=\"text-sm text-green-600\">\n                    Your card rarities are closely matching the expected probabilities.\n                  </div>\n                </div>\n              )}\n            </div>\n          </CardContent>\n        </Card>\n      )}\n\n      {/* Legend */}\n      {showComparison && (\n        <Card>\n          <CardContent className=\"p-4\">\n            <div className=\"flex items-center justify-center space-x-6 text-sm text-gray-600\">\n              <div className=\"flex items-center space-x-2\">\n                <div className=\"w-4 h-2 bg-blue-500 rounded\" />\n                <span>Actual Distribution</span>\n              </div>\n              <div className=\"flex items-center space-x-2\">\n                <div className=\"w-4 h-2 bg-gray-400 rounded opacity-50\" />\n                <span>Expected Distribution</span>\n              </div>\n            </div>\n          </CardContent>\n        </Card>\n      )}\n    </div>\n  );\n};\n\nexport default RarityDistribution;"