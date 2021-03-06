import {Entity, Column, PrimaryGeneratedColumn} from 'typeorm';
import {DatedRecordEntity} from '../database/DatedRecord.entity';

@Entity('tags')
export class TagEntity extends DatedRecordEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(
    {
      type: 'varchar',
      length: 60,
      unique: true,
    },
  )
  name: string;

  constructor(partial: Partial<TagEntity>) {
    super();
    Object.assign(this, partial);
  }
}
