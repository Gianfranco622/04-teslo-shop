import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import * as bcrypt from "bcrypt";

import { User } from './entities/user.entity';
import { LoginUserDto, CreateUserDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService
  ) {}

  async create(createUserDto: CreateUserDto) {

    try {

      const { password, ...userDate } = createUserDto;
      
      const user = this.userRepository.create({
        ...userDate,
        password: bcrypt.hashSync( password, 10 )
      });

      await this.userRepository.save( user );
      delete user.password;

      return { 
        ...user,
        token: this.getJWTToken({ id: user.id })
      };
      // TODO: Retornar el JWT de acceso
      
    } catch (error) {
      this.handleDBError(error);
    }

  }

  async login( loginUserDto: LoginUserDto ) {

    const { password, email } = loginUserDto;

    const user = await this.userRepository.findOne({
      where: { email },
      select: { email: true, password: true, id: true }
    });

    if ( !user )
      throw new UnauthorizedException('Credentials are not valid (email)')

    if ( !bcrypt.compareSync( password, user.password) )
      throw new UnauthorizedException('Credentials are not valid (password)')

    return { 
      ...user,
      token: this.getJWTToken({ id: user.id })
    };

  }

  async checkAuthStatus( user: User ) {

    return { 
      ...user,
      token: this.getJWTToken({ id: user.id })
    };
    
  }

  private getJWTToken ( payload: JwtPayload ) {

    const token = this.jwtService.sign( payload );
    return token;

  }

  private handleDBError ( error: any ): never {
    if ( error.code === '23505' )
      throw new BadRequestException( error.detail );

    console.log( error )

    throw new InternalServerErrorException('Please check server logs');

  }

}
