const Airtable = require('airtable');

exports.handler = async function(context, event, callback) {
    // Initialize response object
    const response = new Twilio.Response();
    response.appendHeader('Content-Type', 'application/json');

    try {
        // Initialize Airtable
        const base = new Airtable({apiKey: context.AIRTABLE_API_KEY})
            .base(context.AIRTABLE_BASE_ID);

        // Extract filter criteria from the event body
        const { city, state, zip_code, price } = event;

        // Build filter formula
        let filterConditions = [];
        
        if (city) {
            filterConditions.push(`{city} = '${city}'`);
        }
        
        if (state) {
            filterConditions.push(`{state} = '${state}'`);
        }
        
        if (zip_code) {
            filterConditions.push(`{zip_code} = '${zip_code}'`);
        }
        
        if (price) {
            filterConditions.push(`{price} <= ${parseFloat(price)}`);
        }

        // Combine conditions with AND operator
        const filterFormula = filterConditions.length > 0 
            ? `AND(${filterConditions.join(', ')})`
            : '';

        // Query Airtable
        const records = await new Promise((resolve, reject) => {
            let allRecords = [];
            
            base('Listings').select({
                filterByFormula: filterFormula
            }).eachPage(
                function page(records, fetchNextPage) {
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
                        reject(err);
                    } else {
                        resolve(allRecords);
                    }
                }
            );
        });

        // Set success response
        response.setStatusCode(200);
        response.setBody({
            success: true,
            count: records.length,
            listings: records
        });

        callback(null, response);

    } catch (error) {
        console.error('Error:', error);
        response.setStatusCode(500);
        response.setBody({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
        
        callback(null, response);
    }
};