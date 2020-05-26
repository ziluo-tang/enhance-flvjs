/*
 * Copyright (C) 2016 Bilibili. All Rights Reserved.
 *
 * @author zheng qian <xqq@xqq.im>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import ExpGolomb from './exp-golomb.js';
import NALBitstream from './hevc-golomb.js';

class SPSParser {

    static _ebsp2rbsp(uint8array) {
        let src = uint8array;
        let src_length = src.byteLength;
        let dst = new Uint8Array(src_length);
        let dst_idx = 0;

        for (let i = 0; i < src_length; i++) {
            if (i >= 2) {
                // Unescape: Skip 0x03 after 00 00
                if (src[i] === 0x03 && src[i - 1] === 0x00 && src[i - 2] === 0x00) {
                    continue;
                }
            }
            dst[dst_idx] = src[i];
            dst_idx++;
        }

        return new Uint8Array(dst.buffer, 0, dst_idx);
    }

    static parseHevcSPS(uint8array)
    {
        let hevcgb = new NALBitstream(uint8array, uint8array.byteLength);
        hevcgb.GetWord(4);
        let sps_max_sub_layers_minus1 = hevcgb.GetWord(3);

        if (sps_max_sub_layers_minus1 > 6) 
        {
            return;
        }
        let sps_temporal_id_nesting_flag = hevcgb.GetWord(1);
        //let sps_seq_parameter_set_id = hevcgb.GetUE();
        let profile_space = hevcgb.GetWord(2);
        let tier_flag = hevcgb.GetWord(1); 
        let profile = hevcgb.GetWord(5); 
        hevcgb.GetWord(32);//
        hevcgb.GetWord(1);// 
        hevcgb.GetWord(1);// 
        hevcgb.GetWord(1);// 
        hevcgb.GetWord(1);//  
        hevcgb.GetWord(44);// 
        let level = hevcgb.GetWord(8);// general_level_idc
        let sub_layer_profile_present_flag = new Array();
        let sub_layer_level_present_flag = new Array();
        for (let i = 0; i < sps_max_sub_layers_minus1; i++) {
            sub_layer_profile_present_flag[i] = hevcgb.GetWord(1);
            sub_layer_level_present_flag[i] = hevcgb.GetWord(1);
        }
        if (sps_max_sub_layers_minus1 > 0) 
        {
            for (let i = sps_max_sub_layers_minus1; i < 8; i++) {
                hevcgb.GetWord(2);
            }
        }
        for (let i = 0; i < sps_max_sub_layers_minus1; i++) 
        {
            if (sub_layer_profile_present_flag[i]) {
                hevcgb.GetWord(2); 
                hevcgb.GetWord(1); 
                hevcgb.GetWord(5);
                hevcgb.GetWord(32); 
                hevcgb.GetWord(1); 
                hevcgb.GetWord(1); 
                hevcgb.GetWord(1); 
                hevcgb.GetWord(1); 
                hevcgb.GetWord(44); 
            }
            if (sub_layer_level_present_flag[i]) {
                hevcgb.GetWord(8);// sub_layer_level_idc[i]
            }
        }
        let sps_seq_parameter_set_id = hevcgb.GetUE();  
        if (sps_seq_parameter_set_id > 15) {
            return false;
        }
        let chroma_format_idc = hevcgb.GetUE();  
        if (sps_seq_parameter_set_id > 3) {
            return false;
        }
        if (chroma_format_idc == 3) {
            hevcgb.GetWord(1);//  
        }
        let width  = hevcgb.GetUE(); // pic_width_in_luma_samples
        let height  = hevcgb.GetUE(); // pic_height_in_luma_samples
        if (hevcgb.GetWord(1)) { 
            hevcgb.GetUE();  
            hevcgb.GetUE();  
            hevcgb.GetUE();  
            hevcgb.GetUE();   
        }
        let bit_depth_luma_minus8 = hevcgb.GetUE() + 8;
        let bit_depth_chroma_minus8 = hevcgb.GetUE() + 8;
        if (bit_depth_luma_minus8 != bit_depth_chroma_minus8) {
            return false;
        }

        let log2_max_poc_lsb = hevcgb.GetUE();
        if (log2_max_poc_lsb > 16) {
            return false;
        }

        let sublayer_ordering_info = hevcgb.GetWord(1);
        if (sublayer_ordering_info)
        {
            sublayer_ordering_info = 0;
        }
        else
        {
            sublayer_ordering_info = sps_max_sub_layers_minus1;
        }

        

        //let start = 0;//sublayer_ordering_info ? 0 : sps_max_sub_layers_minus1 - 1;
      //  let val = sublayer_ordering_info - start;
        //let i = start;
        //let temporal_layerArr = new Array();
        for (let j = sublayer_ordering_info; j < sps_max_sub_layers_minus1; j++) {
            hevcgb.GetUE();
            hevcgb.GetUE();
            hevcgb.GetUE();

        }

        let log2_min_cb_size = hevcgb.GetUE() + 3;
        let log2_diff_max_min_coding_block_size = hevcgb.GetUE();
        let log2_min_tb_size = hevcgb.GetUE() + 2;
        let log2_diff_max_min_transform_block_size1 = hevcgb.GetUE();
        let log2_max_trafo_size = log2_diff_max_min_transform_block_size1 + log2_min_tb_size;

        let max_transform_hierarchy_depth_inter = hevcgb.GetUE();
        let max_transform_hierarchy_depth_intra = hevcgb.GetUE();

        let scaling_list_enable_flag = hevcgb.GetWord(1);
        if ((scaling_list_enable_flag) && (hevcgb.GetWord(1)))
        {
            for (let size_id = 0; size_id < 4; size_id++)
            {
                for (let matrix_id = 0; matrix_id < (size_id == 3 ? 2 : 6); matrix_id ++) 
                {
                    let scaling_list_pred_mode_flag = hevcgb.GetWord(1);
                    if (!scaling_list_pred_mode_flag)
                    {
                        hevcgb.GetUE();
                    }
                    else
                    {
                        let tmp = 1 << (4 + (size_id << 1));
                        let num_coeffs = 0;
                        if (tmp > 64)
                        {
                            num_coeffs = 64;
                        }
                        else
                        {
                            num_coeffs = tmp;
                        }

                        if (size_id > 1)
                        {
                            hevcgb.GetSE();
                        }

                        for (let k = 0; k < num_coeffs; k++)
                        {
                            hevcgb.GetSE();
                        }
                    }
                }
            }
        }



        hevcgb.GetWord(1);
        hevcgb.GetWord(1);
        let pcm_enabled_flag = hevcgb.GetWord(1);
        if (pcm_enabled_flag)
        {
            let pcm_bit_depth = hevcgb.GetWord(4) + 1;
            let pcm_bit_depth_chroma = hevcgb.GetWord(4) + 1;
            let pcm_log2_min_pcm_cb_size = hevcgb.GetUE() + 3;
            let pcm_log2_max_pcm_cb_size = hevcgb.GetUE() + pcm_log2_min_pcm_cb_size;

            let pcm_loop_filter_disable_flag = hevcgb.GetWord(1);
        }

        let nb_st_rps = hevcgb.GetUE();
        if (nb_st_rps > 64)
        {
            return false;
        }

        let num_delta_pocs = new Array();
        for (let i = 0; i < nb_st_rps; i++)
        {
            let rps_predict = hevcgb.GetWord(1);
            if ((rps_predict) && i)
            {
                if (i > nb_st_rps)
                {
                    return false;
                }
                let delta_rps_sign = hevcgb.GetWord(1);
                let abs_delta_rps = hevcgb.GetUE() + 1;

                //let delta_rps      = (1 - (delta_rps_sign << 1)) * abs_delta_rps;

                num_delta_pocs[i] = 0;

                for (let j = 0; j <= num_delta_pocs[i - 1]; j++) {
                    let use_delta_flag = 0;
                    let used_by_curr_pic_flag = hevcgb.GetWord(1);
                    if (!used_by_curr_pic_flag)
                        use_delta_flag = hevcgb.GetWord(1);
        
                    if (used_by_curr_pic_flag || use_delta_flag)
                        num_delta_pocs[i]++;
                }
                //let 
            }
            else
            {
                let num_negative_pics = hevcgb.GetUE();
                let nb_positive_pics = hevcgb.GetUE();

                if (nb_positive_pics + num_negative_pics > 2 * hevcgb.GetLeft())
                {
                    return false;
                }

                num_delta_pocs[i] = num_negative_pics + nb_positive_pics;

                for (let j = 0; j < num_negative_pics; j++)
                {
                    hevcgb.GetUE();
                    hevcgb.GetWord(1);
                }

                for (let k = 0; k < nb_positive_pics; k++)
                {
                    hevcgb.GetUE();
                    hevcgb.GetWord(1);
                }
            }
        }

        if (hevcgb.GetWord(1))
        {
            let num_long_term_ref_pics_sps = hevcgb.GetUE();
            if (num_long_term_ref_pics_sps > 31)
            {
                return false;
            }
            for (let i = 0; i < num_long_term_ref_pics_sps; i++) { // num_long_term_ref_pics_sps
                let len = 16;
                if (log2_max_poc_lsb + 4 < 16)
                {
                    len = log2_max_poc_lsb + 4;
                }

                hevcgb.GetWord(len); // lt_ref_pic_poc_lsb_sps[i]
                hevcgb.GetWord(1);      // used_by_curr_pic_lt_sps_flag[i]
            }
        }
        let sps_temporal_mvp_enabled_flag = hevcgb.GetWord(1);
        let strong_intra_smoothing_enabled_flag = hevcgb.GetWord(1);

        let fps = 0, fps_fixed = true, fps_num = 0, fps_den = 0;
        let vui_parameters_present_flag = hevcgb.GetWord(1);
        if (vui_parameters_present_flag)
        {
            if (hevcgb.GetWord(1))
            {
                let aspect_ratio_idc = hevcgb.GetWord(8);
                if (aspect_ratio_idc == 255)
                {
                    let sar_width = hevcgb.GetWord(16);
                    let sar_height = hevcgb.GetWord(16);
                }
            }

            if (hevcgb.GetWord(1))
            {
                hevcgb.GetWord(1);
            }

            if (hevcgb.GetWord(1))
            {
                let video_format = hevcgb.GetWord(3);
                let video_full_range_flag = hevcgb.GetWord(1);

                if (hevcgb.GetWord(1))
                {
                    hevcgb.GetWord(24);
                }
            }

            if (hevcgb.GetWord(1))
            {
                hevcgb.GetUE();
                hevcgb.GetUE();
            }

            hevcgb.GetWord(3);

            if (hevcgb.GetWord(1)) {        // default_display_window_flag
                hevcgb.GetUE(); // def_disp_win_left_offset
                hevcgb.GetUE(); // def_disp_win_right_offset
                hevcgb.GetUE(); // def_disp_win_top_offset
                hevcgb.GetUE(); // def_disp_win_bottom_offset
            }
        
            if (hevcgb.GetWord(1)) { // vui_timing_info_present_flag
                let num_units_in_tick = hevcgb.GetUE();
                let time_scale = hevcgb.GetUE();

                fps_fixed = true;
                fps_num = time_scale;
                fps_den = num_units_in_tick * 2;
                fps = fps_num / fps_den;

                if (hevcgb.GetWord(1))
                {
                    let num_ticks_poc_diff_one_minus1 = hevcgb.GetUE();
                }
        
               // if (get_bits1(gb)) // vui_hrd_parameters_present_flag
               //     skip_hrd_parameters(gb, 1, max_sub_layers_minus1);
            }

        }


        return {
            //profile_string: profile_string,  // baseline, high, high10, ...
            //level_string: level_string,  // 3, 3.1, 4, 4.1, 5, 5.1, ...
            bit_depth: bit_depth_luma_minus8,  // 8bit, 10bit, ...
            //ref_frames: ref_frames,
            chroma_format: chroma_format_idc,  // 4:2:0, 4:2:2, ...
            chroma_format_string: SPSParser.getHevcChromaFormatString(chroma_format_idc),

            frame_rate: {
                fixed: fps_fixed,
                fps: fps,
                fps_den: fps_den,
                fps_num: fps_num
            },

            sar_ratio: {
                width: width,
                height: height
            },

            codec_size: {
                width: width,
                height: height
            },

            present_size: {
                width: width,
                height: height
            }
        };
    }

    static parseSPS(uint8array) {
        let rbsp = SPSParser._ebsp2rbsp(uint8array);
        let gb = new ExpGolomb(rbsp);

        gb.readByte();
        let profile_idc = gb.readByte();  // profile_idc
        gb.readByte();  // constraint_set_flags[5] + reserved_zero[3]
        let level_idc = gb.readByte();  // level_idc
        gb.readUEG();  // seq_parameter_set_id

        let profile_string = SPSParser.getProfileString(profile_idc);
        let level_string = SPSParser.getLevelString(level_idc);
        let chroma_format_idc = 1;
        let chroma_format = 420;
        let chroma_format_table = [0, 420, 422, 444];
        let bit_depth = 8;

        if (profile_idc === 100 || profile_idc === 110 || profile_idc === 122 ||
            profile_idc === 244 || profile_idc === 44 || profile_idc === 83 ||
            profile_idc === 86 || profile_idc === 118 || profile_idc === 128 ||
            profile_idc === 138 || profile_idc === 144) {

            chroma_format_idc = gb.readUEG();
            if (chroma_format_idc === 3) {
                gb.readBits(1);  // separate_colour_plane_flag
            }
            if (chroma_format_idc <= 3) {
                chroma_format = chroma_format_table[chroma_format_idc];
            }

            bit_depth = gb.readUEG() + 8;  // bit_depth_luma_minus8
            gb.readUEG();  // bit_depth_chroma_minus8
            gb.readBits(1);  // qpprime_y_zero_transform_bypass_flag
            if (gb.readBool()) {  // seq_scaling_matrix_present_flag
                let scaling_list_count = (chroma_format_idc !== 3) ? 8 : 12;
                for (let i = 0; i < scaling_list_count; i++) {
                    if (gb.readBool()) {  // seq_scaling_list_present_flag
                        if (i < 6) {
                            SPSParser._skipScalingList(gb, 16);
                        } else {
                            SPSParser._skipScalingList(gb, 64);
                        }
                    }
                }
            }
        }
        gb.readUEG();  // log2_max_frame_num_minus4
        let pic_order_cnt_type = gb.readUEG();
        if (pic_order_cnt_type === 0) {
            gb.readUEG();  // log2_max_pic_order_cnt_lsb_minus_4
        } else if (pic_order_cnt_type === 1) {
            gb.readBits(1);  // delta_pic_order_always_zero_flag
            gb.readSEG();  // offset_for_non_ref_pic
            gb.readSEG();  // offset_for_top_to_bottom_field
            let num_ref_frames_in_pic_order_cnt_cycle = gb.readUEG();
            for (let i = 0; i < num_ref_frames_in_pic_order_cnt_cycle; i++) {
                gb.readSEG();  // offset_for_ref_frame
            }
        }
        let ref_frames = gb.readUEG();  // max_num_ref_frames
        gb.readBits(1);  // gaps_in_frame_num_value_allowed_flag

        let pic_width_in_mbs_minus1 = gb.readUEG();
        let pic_height_in_map_units_minus1 = gb.readUEG();

        let frame_mbs_only_flag = gb.readBits(1);
        if (frame_mbs_only_flag === 0) {
            gb.readBits(1);  // mb_adaptive_frame_field_flag
        }
        gb.readBits(1);  // direct_8x8_inference_flag

        let frame_crop_left_offset = 0;
        let frame_crop_right_offset = 0;
        let frame_crop_top_offset = 0;
        let frame_crop_bottom_offset = 0;

        let frame_cropping_flag = gb.readBool();
        if (frame_cropping_flag) {
            frame_crop_left_offset = gb.readUEG();
            frame_crop_right_offset = gb.readUEG();
            frame_crop_top_offset = gb.readUEG();
            frame_crop_bottom_offset = gb.readUEG();
        }

        let sar_width = 1, sar_height = 1;
        let fps = 0, fps_fixed = true, fps_num = 0, fps_den = 0;

        let vui_parameters_present_flag = gb.readBool();
        if (vui_parameters_present_flag) {
            if (gb.readBool()) {  // aspect_ratio_info_present_flag
                let aspect_ratio_idc = gb.readByte();
                let sar_w_table = [1, 12, 10, 16, 40, 24, 20, 32, 80, 18, 15, 64, 160, 4, 3, 2];
                let sar_h_table = [1, 11, 11, 11, 33, 11, 11, 11, 33, 11, 11, 33,  99, 3, 2, 1];

                if (aspect_ratio_idc > 0 && aspect_ratio_idc < 16) {
                    sar_width = sar_w_table[aspect_ratio_idc - 1];
                    sar_height = sar_h_table[aspect_ratio_idc - 1];
                } else if (aspect_ratio_idc === 255) {
                    sar_width = gb.readByte() << 8 | gb.readByte();
                    sar_height = gb.readByte() << 8 | gb.readByte();
                }
            }

            if (gb.readBool()) {  // overscan_info_present_flag
                gb.readBool();  // overscan_appropriate_flag
            }
            if (gb.readBool()) {  // video_signal_type_present_flag
                gb.readBits(4);  // video_format & video_full_range_flag
                if (gb.readBool()) {  // colour_description_present_flag
                    gb.readBits(24);  // colour_primaries & transfer_characteristics & matrix_coefficients
                }
            }
            if (gb.readBool()) {  // chroma_loc_info_present_flag
                gb.readUEG();  // chroma_sample_loc_type_top_field
                gb.readUEG();  // chroma_sample_loc_type_bottom_field
            }
            if (gb.readBool()) {  // timing_info_present_flag
                let num_units_in_tick = gb.readBits(32);
                let time_scale = gb.readBits(32);
                fps_fixed = gb.readBool();  // fixed_frame_rate_flag

                fps_num = time_scale;
                fps_den = num_units_in_tick * 2;
                fps = fps_num / fps_den;
            }
        }

        let sarScale = 1;
        if (sar_width !== 1 || sar_height !== 1) {
            sarScale = sar_width / sar_height;
        }

        let crop_unit_x = 0, crop_unit_y = 0;
        if (chroma_format_idc === 0) {
            crop_unit_x = 1;
            crop_unit_y = 2 - frame_mbs_only_flag;
        } else {
            let sub_wc = (chroma_format_idc === 3) ? 1 : 2;
            let sub_hc = (chroma_format_idc === 1) ? 2 : 1;
            crop_unit_x = sub_wc;
            crop_unit_y = sub_hc * (2 - frame_mbs_only_flag);
        }

        let codec_width = (pic_width_in_mbs_minus1 + 1) * 16;
        let codec_height = (2 - frame_mbs_only_flag) * ((pic_height_in_map_units_minus1 + 1) * 16);

        codec_width -= (frame_crop_left_offset + frame_crop_right_offset) * crop_unit_x;
        codec_height -= (frame_crop_top_offset + frame_crop_bottom_offset) * crop_unit_y;

        let present_width = Math.ceil(codec_width * sarScale);

        gb.destroy();
        gb = null;

        return {
            profile_string: profile_string,  // baseline, high, high10, ...
            level_string: level_string,  // 3, 3.1, 4, 4.1, 5, 5.1, ...
            bit_depth: bit_depth,  // 8bit, 10bit, ...
            ref_frames: ref_frames,
            chroma_format: SPSParser.getHevcChromaFormatUnit(chroma_format),  // 4:2:0, 4:2:2, ...
            chroma_format_string: SPSParser.getChromaFormatString(chroma_format),

            frame_rate: {
                fixed: fps_fixed,
                fps: fps,
                fps_den: fps_den,
                fps_num: fps_num
            },

            sar_ratio: {
                width: sar_width,
                height: sar_height
            },

            codec_size: {
                width: codec_width,
                height: codec_height
            },

            present_size: {
                width: present_width,
                height: codec_height
            }
        };
    }

    static _skipScalingList(gb, count) {
        let last_scale = 8, next_scale = 8;
        let delta_scale = 0;
        for (let i = 0; i < count; i++) {
            if (next_scale !== 0) {
                delta_scale = gb.readSEG();
                next_scale = (last_scale + delta_scale + 256) % 256;
            }
            last_scale = (next_scale === 0) ? last_scale : next_scale;
        }
    }

    static getProfileString(profile_idc) {
        switch (profile_idc) {
            case 66:
                return 'Baseline';
            case 77:
                return 'Main';
            case 88:
                return 'Extended';
            case 100:
                return 'High';
            case 110:
                return 'High10';
            case 122:
                return 'High422';
            case 244:
                return 'High444';
            default:
                return 'Unknown';
        }
    }

    /*
    static getHevcProfileString(profile_idc)
    {
        switch(profile_idc)
        {
            case :
                return "Main";
            case :
                return "Main10";
            case :
                return "Main Still Picture";
            default:
                return 'Unknown';
        }
    }*/

    static getLevelString(level_idc) {
        return (level_idc / 10).toFixed(1);
    }

    static getChromaFormatString(chroma) {
        switch (chroma) {
            case 420:
                return '4:2:0';
            case 422:
                return '4:2:2';
            case 444:
                return '4:4:4';
            default:
                return 'Unknown';
        }
    }

    static getHevcChromaFormatString(chroma) {
        switch (chroma) {
            case 1:
                return '4:2:0';
            case 2:
                return '4:2:2';
            case 3:
                return '4:4:4';
            default:
                return 'Unknown';
        }
    }

    static getHevcChromaFormatUnit(chroma) {
        switch (chroma) {
            case 1:
                return 420;
            case 2:
                return 422;
            case 3:
                return 444;
            default:
                return 0;
        }
    }
}

export default SPSParser;