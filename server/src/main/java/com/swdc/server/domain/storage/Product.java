/**
 *
 *  _product_coll에 포함되는 products(List)의 구성요소
 *  ---------------------------------------------
 *  DB -> filesystem의 변경으로 사용 X
 *
 */

package com.swdc.server.domain.storage;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
public class Product {
    private String product_id;

    private List<Map<String, Integer>> prices;
}
