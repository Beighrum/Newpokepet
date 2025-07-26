import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PremiumGate from '../PremiumGate';
import { useSubscription } from '@/hooks/useSubscription';

// Mock the subscription hook
jest.mock('@/hooks/useSubscription');

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardDescription: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>
}));

jest.mock('../PremiumBadge', () => {
  return function PremiumBadge({ tier }: { tier: string }) {
    return <span data-testid="premium-badge">{tier}</span>;
  };
});

jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

const mockUseSubscription = useSubscription as jest.MockedFunction<typeof useSubscription>;

describe('PremiumGate', () => {
  const defaultProps = {
    feature: 'card_evolution',
    requiredTier: 'premium' as const,
    title: 'Card Evolution',
    description: 'Evolve your cards to higher rarities',
    children: <div data-testid="protected-content">Protected Content</div>
  };

  const mockSubscriptionHook = {
    subscription: null,
    loading: false,
    error: null,
    hasTierAccess: jest.fn(),
    hasFeatureAccess: jest.fn(),
    getUsageLimits: jest.fn(),
    getPremiumFeatures: jest.fn(),
    upgradeSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    isExpired: false,
    daysUntilExpiration: null,
    refresh: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSubscription.mockReturnValue(mockSubscriptionHook);
  });

  it('renders children when user has required tier access', () => {
    mockSubscriptionHook.hasTierAccess.mockReturnValue(true);
    
    render(<PremiumGate {...defaultProps} />);
    
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByText('Card Evolution')).not.toBeInTheDocument();
  });

  it('renders fallback when provided and user lacks access', () => {
    mockSubscriptionHook.hasTierAccess.mockReturnValue(false);
    
    const fallback = <div data-testid="fallback-content">Fallback Content</div>;
    
    render(<PremiumGate {...defaultProps} fallback={fallback} />);
    
    expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders premium gate UI when user lacks access and no fallback', () => {
    mockSubscriptionHook.hasTierAccess.mockReturnValue(false);
    
    render(<PremiumGate {...defaultProps} />);
    
    expect(screen.getByText('Card Evolution')).toBeInTheDocument();
    expect(screen.getByText('Evolve your cards to higher rarities')).toBeInTheDocument();
    expect(screen.getByTestId('premium-badge')).toHaveTextContent('premium');
    expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument();
  });

  it('shows blurred protected content in gate UI', () => {
    mockSubscriptionHook.hasTierAccess.mockReturnValue(false);
    
    render(<PremiumGate {...defaultProps} />);
    
    // Content should be present but blurred/disabled
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    
    // Should have blur and pointer-events-none classes
    const blurredContent = screen.getByTestId('protected-content').closest('div');
    expect(blurredContent).toHaveClass('pointer-events-none', 'select-none', 'opacity-50', 'blur-sm');
  });

  it('opens upgrade dialog when upgrade button is clicked', async () => {
    mockSubscriptionHook.hasTierAccess.mockReturnValue(false);
    
    render(<PremiumGate {...defaultProps} />);
    
    const upgradeButton = screen.getByText('Upgrade to Premium');
    await userEvent.click(upgradeButton);
    
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Upgrade Your Plan')).toBeInTheDocument();
  });

  it('shows Pro upgrade option for pro tier requirement', async () => {
    mockSubscriptionHook.hasTierAccess.mockReturnValue(false);
    
    render(
      <PremiumGate 
        {...defaultProps} 
        requiredTier="pro"
        title="Video Generation"
      />
    );
    
    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
    
    const upgradeButton = screen.getByText('Upgrade to Pro');
    await userEvent.click(upgradeButton);
    
    expect(screen.getByText('$19.99/mo')).toBeInTheDocument();
  });

  it('handles upgrade to premium', async () => {
    mockSubscriptionHook.hasTierAccess.mockReturnValue(false);
    mockSubscriptionHook.upgradeSubscription.mockResolvedValue();
    
    render(<PremiumGate {...defaultProps} />);
    
    // Open dialog
    const upgradeButton = screen.getByText('Upgrade to Premium');
    await userEvent.click(upgradeButton);
    
    // Click premium upgrade
    const premiumButton = screen.getByText('Choose Premium');
    await userEvent.click(premiumButton);
    
    expect(mockSubscriptionHook.upgradeSubscription).toHaveBeenCalledWith('premium');
  });

  it('handles upgrade to pro', async () => {
    mockSubscriptionHook.hasTierAccess.mockReturnValue(false);
    mockSubscriptionHook.upgradeSubscription.mockResolvedValue();
    
    render(<PremiumGate {...defaultProps} />);
    
    // Open dialog
    const upgradeButton = screen.getByText('Upgrade to Premium');
    await userEvent.click(upgradeButton);
    
    // Click pro upgrade
    const proButton = screen.getByText('Choose Pro');
    await userEvent.click(proButton);
    
    expect(mockSubscriptionHook.upgradeSubscription).toHaveBeenCalledWith('pro');
  });

  it('shows loading state during upgrade', async () => {
    mockSubscriptionHook.hasTierAccess.mockReturnValue(false);
    mockSubscriptionHook.upgradeSubscription.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<PremiumGate {...defaultProps} />);
    
    // Open dialog
    const upgradeButton = screen.getByText('Upgrade to Premium');
    await userEvent.click(upgradeButton);
    
    // Click premium upgrade
    const premiumButton = screen.getByText('Choose Premium');
    await userEvent.click(premiumButton);
    
    expect(screen.getByText('Upgrading...')).toBeInTheDocument();
  });

  it('handles upgrade errors gracefully', async () => {
    mockSubscriptionHook.hasTierAccess.mockReturnValue(false);
    mockSubscriptionHook.upgradeSubscription.mockRejectedValue(new Error('Upgrade failed'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<PremiumGate {...defaultProps} />);
    
    // Open dialog
    const upgradeButton = screen.getByText('Upgrade to Premium');
    await userEvent.click(upgradeButton);
    
    // Click premium upgrade
    const premiumButton = screen.getByText('Choose Premium');
    await userEvent.click(premiumButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Upgrade failed:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('closes dialog when "Maybe Later" is clicked', async () => {
    mockSubscriptionHook.hasTierAccess.mockReturnValue(false);
    
    render(<PremiumGate {...defaultProps} />);
    
    // Open dialog
    const upgradeButton = screen.getByText('Upgrade to Premium');
    await userEvent.click(upgradeButton);
    
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    
    // Click "Maybe Later"
    const maybeLaterButton = screen.getByText('Maybe Later');
    await userEvent.click(maybeLaterButton);
    
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('hides upgrade prompt when showUpgradePrompt is false', () => {
    mockSubscriptionHook.hasTierAccess.mockReturnValue(false);
    
    render(<PremiumGate {...defaultProps} showUpgradePrompt={false} />);
    
    expect(screen.queryByText('Upgrade to Premium')).not.toBeInTheDocument();
  });

  it('disables upgrade button when loading', () => {
    mockSubscriptionHook.hasTierAccess.mockReturnValue(false);
    mockSubscriptionHook.loading = true;
    
    render(<PremiumGate {...defaultProps} />);
    
    const upgradeButton = screen.getByText('Upgrade to Premium');
    expect(upgradeButton).toBeDisabled();
  });

  it('applies custom className', () => {
    mockSubscriptionHook.hasTierAccess.mockReturnValue(false);
    
    const { container } = render(
      <PremiumGate {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays correct tier-specific content', () => {
    mockSubscriptionHook.hasTierAccess.mockReturnValue(false);
    
    render(
      <PremiumGate 
        {...defaultProps} 
        requiredTier="pro"
        title="Pro Feature"
      />
    );
    
    expect(screen.getByText('Pro Feature')).toBeInTheDocument();
    expect(screen.getByTestId('premium-badge')).toHaveTextContent('pro');
  });
});