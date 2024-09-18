/**
 *
 *  Product_price_db의 collection인 {platform}_product_coll에 해당
 *
 */

package com.swdc.server.domain.mongoDB.collection;

import com.swdc.server.domain.mongoDB.Product;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class ProductCollection {
    private String id;

    private Integer category_id;
    private List<Product> products;
}
