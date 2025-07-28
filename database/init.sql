-- ===========================================
-- MENO NFT OFF-RAMP DATABASE INITIALIZATION
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- USERS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    email VARCHAR(255),
    kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected', 'expired')),
    kyc_data JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    is_blacklisted BOOLEAN DEFAULT FALSE,
    total_converted DECIMAL(36,18) DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    last_conversion_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- NFT COLLECTIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS nft_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50),
    description TEXT,
    image_url TEXT,
    external_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(contract_address, chain_id)
);

-- ===========================================
-- NFTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS nfts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID REFERENCES nft_collections(id),
    contract_address VARCHAR(42) NOT NULL,
    token_id VARCHAR(78) NOT NULL,
    chain_id INTEGER NOT NULL,
    owner_address VARCHAR(42) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    image_url TEXT,
    metadata_uri TEXT,
    metadata JSONB DEFAULT '{}',
    attributes JSONB DEFAULT '[]',
    last_synced_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(contract_address, token_id, chain_id)
);

-- ===========================================
-- LISTINGS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_hash VARCHAR(66) UNIQUE NOT NULL,
    nft_id UUID REFERENCES nfts(id),
    seller_address VARCHAR(42) NOT NULL,
    price DECIMAL(36,18) NOT NULL,
    currency VARCHAR(10) DEFAULT 'ETH',
    duration INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled', 'expired')),
    fiat_offramp_enabled BOOLEAN DEFAULT FALSE,
    meno_listing_id VARCHAR(66),
    morph_listing_id VARCHAR(66),
    external_marketplace VARCHAR(42),
    external_listing_id VARCHAR(66),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- TRANSACTIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('listing', 'sale', 'cancel', 'update', 'fiat_conversion')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled')),
    nft_id UUID REFERENCES nfts(id),
    listing_id UUID REFERENCES listings(id),
    buyer_address VARCHAR(42),
    seller_address VARCHAR(42) NOT NULL,
    price DECIMAL(36,18),
    currency VARCHAR(10) DEFAULT 'ETH',
    platform_fee DECIMAL(36,18) DEFAULT 0,
    chain_id INTEGER NOT NULL,
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    gas_used BIGINT,
    gas_price DECIMAL(36,18),
    fiat_conversion_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- ===========================================
-- FIAT CONVERSION REQUESTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS fiat_conversion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_hash VARCHAR(66) UNIQUE NOT NULL,
    user_address VARCHAR(42) NOT NULL,
    transaction_id UUID REFERENCES transactions(id),
    amount DECIMAL(36,18) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    bank_details_encrypted TEXT NOT NULL,
    preferred_provider VARCHAR(42),
    assigned_provider VARCHAR(42),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'expired')),
    exchange_rate DECIMAL(36,18),
    fiat_amount DECIMAL(18,2),
    fees DECIMAL(36,18) DEFAULT 0,
    failure_reason TEXT,
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- ===========================================
-- OFF-RAMP PROVIDERS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS offramp_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_address VARCHAR(42) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    api_endpoint VARCHAR(255),
    supported_currencies TEXT[] NOT NULL,
    supported_countries TEXT[] NOT NULL,
    min_amount DECIMAL(36,18) NOT NULL,
    max_amount DECIMAL(36,18) NOT NULL,
    fee_percentage INTEGER NOT NULL, -- in basis points
    fixed_fee DECIMAL(36,18) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    total_processed DECIMAL(36,18) DEFAULT 0,
    successful_conversions INTEGER DEFAULT 0,
    failed_conversions INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN (successful_conversions + failed_conversions) > 0 
            THEN (successful_conversions::DECIMAL / (successful_conversions + failed_conversions)) * 100
            ELSE 0 
        END
    ) STORED,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- MARKETPLACE SYNC LOG TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS marketplace_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id),
    marketplace_address VARCHAR(42) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'cancel', 'sold')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    external_listing_id VARCHAR(66),
    transaction_hash VARCHAR(66),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- ===========================================
-- ANALYTICS EVENTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    user_address VARCHAR(42),
    nft_id UUID REFERENCES nfts(id),
    listing_id UUID REFERENCES listings(id),
    event_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- NFT Collections indexes
CREATE INDEX IF NOT EXISTS idx_nft_collections_contract_chain ON nft_collections(contract_address, chain_id);
CREATE INDEX IF NOT EXISTS idx_nft_collections_verified ON nft_collections(is_verified);

-- NFTs indexes
CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts(owner_address);
CREATE INDEX IF NOT EXISTS idx_nfts_contract_token ON nfts(contract_address, token_id);
CREATE INDEX IF NOT EXISTS idx_nfts_collection ON nfts(collection_id);
CREATE INDEX IF NOT EXISTS idx_nfts_chain ON nfts(chain_id);

-- Listings indexes
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_address);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at);
CREATE INDEX IF NOT EXISTS idx_listings_fiat_enabled ON listings(fiat_offramp_enabled);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_address);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_address);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Fiat conversion requests indexes
CREATE INDEX IF NOT EXISTS idx_fiat_requests_user ON fiat_conversion_requests(user_address);
CREATE INDEX IF NOT EXISTS idx_fiat_requests_status ON fiat_conversion_requests(status);
CREATE INDEX IF NOT EXISTS idx_fiat_requests_provider ON fiat_conversion_requests(assigned_provider);
CREATE INDEX IF NOT EXISTS idx_fiat_requests_created_at ON fiat_conversion_requests(requested_at);

-- Off-ramp providers indexes
CREATE INDEX IF NOT EXISTS idx_providers_status ON offramp_providers(status);
CREATE INDEX IF NOT EXISTS idx_providers_success_rate ON offramp_providers(success_rate);

-- Marketplace sync log indexes
CREATE INDEX IF NOT EXISTS idx_sync_log_listing ON marketplace_sync_log(listing_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_marketplace ON marketplace_sync_log(marketplace_address);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON marketplace_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_sync_log_created_at ON marketplace_sync_log(created_at);

-- Analytics events indexes
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_address);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);

-- ===========================================
-- FUNCTIONS AND TRIGGERS
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nfts_updated_at BEFORE UPDATE ON nfts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON offramp_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate provider success rate
CREATE OR REPLACE FUNCTION update_provider_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.status = 'completed' THEN
            UPDATE offramp_providers 
            SET successful_conversions = successful_conversions + 1,
                total_processed = total_processed + NEW.amount
            WHERE provider_address = NEW.assigned_provider;
        ELSIF NEW.status = 'failed' THEN
            UPDATE offramp_providers 
            SET failed_conversions = failed_conversions + 1
            WHERE provider_address = NEW.assigned_provider;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger for provider stats
CREATE TRIGGER update_provider_stats_trigger 
    AFTER INSERT OR UPDATE ON fiat_conversion_requests 
    FOR EACH ROW EXECUTE FUNCTION update_provider_stats();

-- ===========================================
-- INITIAL DATA
-- ===========================================

-- Insert default NFT collections (Morph ecosystem projects)
INSERT INTO nft_collections (contract_address, chain_id, name, symbol, description, is_verified) VALUES
('0x0000000000000000000000000000000000000001', 2810, 'Koala Sleep Club', 'KSC', 'Consumer-focused community NFTs on Morph Testnet', true),
('0x0000000000000000000000000000000000000002', 2810, 'Blind Box Miracle', 'BBM', 'Mystery box NFT collection on Morph Testnet', true),
('0x0000000000000000000000000000000000000003', 2818, 'Morph Genesis', 'MGEN', 'Genesis collection for Morph Mainnet', true)
ON CONFLICT (contract_address, chain_id) DO NOTHING;

-- Insert sample off-ramp providers
INSERT INTO offramp_providers (
    provider_address, 
    name, 
    supported_currencies, 
    supported_countries, 
    min_amount, 
    max_amount, 
    fee_percentage, 
    fixed_fee,
    status
) VALUES
('0x1000000000000000000000000000000000000001', 'Paycrest', ARRAY['USD', 'EUR', 'NGN'], ARRAY['US', 'EU', 'NG'], 10000000000000000, 100000000000000000000, 250, 1000000000000000, 'active'),
('0x1000000000000000000000000000000000000002', 'Transak', ARRAY['USD', 'EUR', 'GBP'], ARRAY['US', 'EU', 'GB'], 10000000000000000, 50000000000000000000, 300, 2000000000000000, 'active'),
('0x1000000000000000000000000000000000000003', 'Ramp Network', ARRAY['USD', 'EUR'], ARRAY['US', 'EU'], 5000000000000000, 200000000000000000000, 200, 500000000000000, 'active')
ON CONFLICT (provider_address) DO NOTHING;

-- ===========================================
-- VIEWS FOR ANALYTICS
-- ===========================================

-- Active listings view
CREATE OR REPLACE VIEW active_listings AS
SELECT 
    l.*,
    n.name as nft_name,
    n.image_url as nft_image,
    nc.name as collection_name,
    nc.symbol as collection_symbol
FROM listings l
JOIN nfts n ON l.nft_id = n.id
JOIN nft_collections nc ON n.collection_id = nc.id
WHERE l.status = 'active' AND l.expires_at > NOW();

-- User statistics view
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.wallet_address,
    u.kyc_status,
    COUNT(DISTINCT l.id) as total_listings,
    COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.id END) as active_listings,
    COUNT(DISTINCT CASE WHEN l.status = 'sold' THEN l.id END) as sold_listings,
    COALESCE(SUM(CASE WHEN t.type = 'sale' AND t.status = 'confirmed' THEN t.price END), 0) as total_sales_volume,
    u.total_converted,
    u.conversion_count
FROM users u
LEFT JOIN listings l ON u.wallet_address = l.seller_address
LEFT JOIN transactions t ON l.id = t.listing_id
GROUP BY u.id, u.wallet_address, u.kyc_status, u.total_converted, u.conversion_count;

-- Provider performance view
CREATE OR REPLACE VIEW provider_performance AS
SELECT 
    p.*,
    COALESCE(AVG(EXTRACT(EPOCH FROM (fcr.completed_at - fcr.processed_at))/3600), 0) as avg_processing_time_hours,
    COUNT(fcr.id) as total_requests
FROM offramp_providers p
LEFT JOIN fiat_conversion_requests fcr ON p.provider_address = fcr.assigned_provider
GROUP BY p.id;

COMMIT;