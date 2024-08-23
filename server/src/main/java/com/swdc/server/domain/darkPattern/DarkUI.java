package com.swdc.server.domain.darkPattern;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class DarkUI extends UI {
    private Enum<DarkPatternType> darkPatternType;
}
