const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter product name."],
        trim: true,
        maxLength: [100, "Product name cannot exceed up to 100 characters."]
    },
    description: {
        type: String,
        required: [true, "Please enter product description."]
    },
    price: {
        type: Number,
        required: [true, "Please enter product price."]
    },
    ratings: {
        type: Number,
        default: 0
    },
    images: [
        {
            public_id: {
                type: String,
                required: true
            },
            url: {
                type: String,
                required: true
            }
        }
    ],
    category: {
        type: String,
        required: [true, "Please enter product category."],
        enum: {
            values: [
                'Rice Meal',
                'Pasta',
                'Sandwich'
            ],
            message: 'Please select correct category for product'
        }
    },
    status: {
        type: String,
        required: [true, "Please enter product status."],
        enum: {
            values: [
                'Available',
                'Unavailable'
            ],
            message: "Please select correct status."
        }
    },
    discount: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    discountedPrice: {
        type: Number,
        default: 0
    },
    numOfReviews: {
        type: Number,
        default: 0
    },
    reviews: [
        {
            user: {
                type: mongoose.Schema.ObjectId,
                ref: 'User',
                required: true
            },
            name: {
                type: String,
                required: true
            },
            rating: {
                type: Number,
                required: true
            },
            comment: {
                type: String,
                required: true
            }
        }
    ],
    // user: {
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'User',
    //     required: true
    // },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

// Add pre-save middleware to calculate discounted price
productSchema.pre('save', function(next) {
    if (this.discount > 0) {
        this.discountedPrice = this.price - (this.price * (this.discount / 100));
    } else {
        this.discountedPrice = this.price;
    }
    next();
});

module.exports = mongoose.model('Product', productSchema);