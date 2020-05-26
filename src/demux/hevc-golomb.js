class NALBitstream
{
    constructor(uint8array, len)
    {
        this.m_data = uint8array;
        this.m_len = len;
        this.m_idx = 0; 
        this.m_bits = 0;
        this.m_byte = 0; 
        this.m_zeros = 0;
    }

    GetLeft()
    {
        return this.m_len - this.m_idx;
    }

    GetBYTE()
    {
        if (this.m_idx >= this.m_len)
            return 0;
        let b = this.m_data[this.m_idx++];
        if (b == 0)
        {
            this.m_zeros++;
            if ((this.m_idx < this.m_len) && (this.m_zeros == 2) && (this.m_data[this.m_idx] == 0x03))
            {
                this.m_idx++;
                this.m_zeros = 0;
            }
        } 
        else  this.m_zeros = 0;

        return b;
    }

    GetBit() 
    {
        if (this.m_bits == 0)
        {
            this.m_byte = this.GetBYTE();
            this.m_bits = 8;
        }
        this.m_bits--;
        return (this.m_byte >> this.m_bits) & 0x1;
    }

    GetWord(bits) 
    {
        let u = 0;
        while (bits > 0)
        {
            u <<= 1;
            u |= this.GetBit();
            bits--;
        }
        return u;
    }

    GetUE() 
    {
        let zeros = 0;
        while (this.m_idx < this.m_len && this.GetBit() == 0) zeros++;
        return this.GetWord(zeros) + ((1 << zeros) - 1);
    }

    GetSE()
    {
        let UE = this.GetUE();
        let positive = UE & 1;
        let SE = (UE + 1) >> 1;
        if (!positive)
        {
            SE = -SE;
        }
        return SE;
    }
}

export default NALBitstream;