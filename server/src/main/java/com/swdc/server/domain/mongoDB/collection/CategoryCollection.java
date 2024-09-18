/**
 *
 *  Product_price_db의 collection인 {platform}_category_coll에 해당
 *
 */

package com.swdc.server.domain.mongoDB.collection;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Getter
@Setter
@NoArgsConstructor
public class CategoryCollection {
    private Integer id;
    private String category_name;
}
