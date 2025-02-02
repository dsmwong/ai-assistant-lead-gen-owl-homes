exports.handler = async function(context, event, callback) {
    console.log('[get-listings] Handler started', { event });
    
    const { createResponse, success, error } = require(Runtime.getAssets()['/utils/response.js'].path);
    const { validateZipCode, validateState, validatePrice } = require(Runtime.getAssets()['/utils/validation.js'].path);
    const ProviderFactory = require(Runtime.getAssets()['/providers/factory.js'].path);

    // Initialize database provider
    const db = ProviderFactory.getDatabase(context);
    console.log('[get-listings] Database provider initialized');

    try {
        // Validate configuration
        const missingConfig = ProviderFactory.validateConfig(context);
        if (missingConfig) {
            console.log('[get-listings] Missing configuration', { missingConfig });
            throw new Error(`Missing configuration: ${JSON.stringify(missingConfig)}`);
        }

        // Extract and validate filter criteria
        const { city, state, zip_code, price } = event;
        console.log('[get-listings] Processing filter criteria', { city, state, zip_code, price });
        
        const validationErrors = {};

        if (state && !validateState(state)) {
            validationErrors.state = 'Invalid state code format';
        }

        if (zip_code && !validateZipCode(zip_code)) {
            validationErrors.zip_code = 'Invalid zip code format';
        }

        if (price && !validatePrice(price)) {
            validationErrors.price = 'Invalid price value';
        }

        if (Object.keys(validationErrors).length > 0) {
            console.log('[get-listings] Validation errors found', { validationErrors });
            return callback(null, createResponse(400, error(
                'Validation failed',
                400,
                validationErrors
            )));
        }

        // Build filter conditions
        let filterConditions = [];
        
        if (city) filterConditions.push(`{city} = '${city}'`);
        if (state) filterConditions.push(`{state} = '${state.toUpperCase()}'`);
        if (zip_code) filterConditions.push(`{zip_code} = '${zip_code}'`);
        if (price) filterConditions.push(`{price} <= ${parseFloat(price)}`);

        console.log('[get-listings] Filter conditions built', { filterConditions });

        // Query Airtable
        const records = await new Promise((resolve, reject) => {
            let allRecords = [];
            
            db.base('Listings').select({
                filterByFormula: filterConditions.length > 0 
                    ? `AND(${filterConditions.join(', ')})`
                    : ''
            }).eachPage(
                function page(records, fetchNextPage) {
                    console.log('[get-listings] Processing page of records', { count: records.length });
                    records.forEach(record => {
                        allRecords.push({
                            id: record.get('id'),
                            title: record.get('title'),
                            description: record.get('description'),
                            address: record.get('address'),
                            city: record.get('city'),
                            state: record.get('state'),
                            zip_code: record.get('zip_code'),
                            price: record.get('price'),
                            beds: record.get('beds'),
                            baths: record.get('bath'),
                            square_feet: record.get('square_feet'),
                            listing_link: record.get('listing_link')
                        });
                    });
                    fetchNextPage();
                },
                function done(err) {
                    if (err) {
                        console.log('[get-listings] Error fetching records', { error: err.message });
                        reject(err);
                    } else {
                        console.log('[get-listings] Successfully fetched all records', { totalRecords: allRecords.length });
                        resolve(allRecords);
                    }
                }
            );
        });

        // Return response with metadata
        console.log('[get-listings] Returning successful response', { recordCount: records.length });
        return callback(null, createResponse(200, success({
            records,
            metadata: {
                page: 1,
                pageSize: records.length,
                total: records.length,
                hasMore: false
            }
        })));

    } catch (err) {
        console.error('[get-listings] Error in handler:', err);
        
        return callback(null, createResponse(500, error(
            'Error fetching listings',
            500,
            process.env.NODE_ENV === 'development' ? err.stack : undefined
        )));
    }
};