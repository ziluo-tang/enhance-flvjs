import NALBitstream from './hevc-golomb.js';

class VPSParser {

    static parseHevcVPS(uint8array)
    {
        let hevcgb = new NALBitstream(uint8array, uint8array.byteLength);
        let vps_id = hevcgb.GetWord(4);

        hevcgb.GetWord(2); //vps_reserved_three_2bits

        let vps_max_layers = hevcgb.GetWord(6) + 1;
        let vps_max_sub_layers = hevcgb.GetWord(3) + 1;
        if (vps_max_sub_layers > 7)
        {
            return false;
        }
        let vps_temporal_id_nesting_flag = hevcgb.GetWord(1);

        hevcgb.GetWord(16);// vps_reserved_ffff_16bits

        let ptl_profile_space = hevcgb.GetWord(2);
        let ptl_tier_flag = hevcgb.GetWord(1); 
        let ptl_profile_idc = hevcgb.GetWord(5); 
        hevcgb.GetWord(32);
        hevcgb.GetWord(1);// 
        hevcgb.GetWord(1);// 
        hevcgb.GetWord(1);// 
        hevcgb.GetWord(1);// 
        hevcgb.GetWord(44);// 
        let level = hevcgb.GetWord(8);// general_level_idc

        let sub_layer_profile_present_flag = new Array();
        let sub_layer_level_present_flag = new Array();
        for (let i = 0; i < vps_max_sub_layers - 1; i++) {
            sub_layer_profile_present_flag[i] = hevcgb.GetWord(1);
            sub_layer_level_present_flag[i] = hevcgb.GetWord(1);
        }

        if ((vps_max_sub_layers - 1 > 0) && (vps_max_sub_layers - 1 < 8))
        {
            for (let i = vps_max_sub_layers - 1; i < 8; i++)
            {
                hevcgb.GetWord(2);
            }
        }

        if ((vps_max_sub_layers - 1 > 0) && (vps_max_sub_layers - 1 < 8))
        {
            for (let i = vps_max_sub_layers - 1; i < 8; i++)
            {
                if (sub_layer_profile_present_flag[i] && (hevcgb.GetLeft() >= 2 + 1 + 5 + 32 + 4 + 16 + 16 + 12))
                {
                    hevcgb.GetWord(2);
                    hevcgb.GetWord(1); 
                    hevcgb.GetWord(5); 
                    hevcgb.GetWord(32);
                    hevcgb.GetWord(1);// 
                    hevcgb.GetWord(1);// 
                    hevcgb.GetWord(1);// 
                    hevcgb.GetWord(1);// 
                    hevcgb.GetWord(44);// 
                }
                if ((sub_layer_level_present_flag[i]) && (hevcgb.GetLeft() >= 8))
                {
                    hevcgb.GetWord(8);// general_level_idc
                }
            }
        }

        let vps_sub_layer_ordering_info_present_flag = hevcgb.GetWord(1);
        
    }
}

export default VPSParser;